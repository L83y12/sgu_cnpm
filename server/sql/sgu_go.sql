/* SGU Go authoritative database setup
   One-time setup: run this entire file in SQL Server Management Studio (SSMS).
   It creates SGUGo, creates the ERD/runtime tables, and loads the current
   SGU campus POIs plus localization/narration data from the project dataset.
   Legacy dbo.Places rows are merged into dbo.POI and the duplicate table is removed.
   Source records are the checked-in SGU app dataset; validate campus details
   and coordinates with the university before production use.
*/
/* SECTION 1: DATABASE SCHEMA */
IF DB_ID(N'SGUGo') IS NULL
BEGIN
  EXEC(N'CREATE DATABASE [SGUGo]');
END;
GO

USE [SGUGo];
GO

IF OBJECT_ID(N'dbo.[ROLE]', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[ROLE] (
    id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_ROLE PRIMARY KEY,
    name NVARCHAR(100) NOT NULL CONSTRAINT UQ_ROLE_name UNIQUE,
    permissions NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ROLE_permissions DEFAULT N'[]',
    CONSTRAINT CK_ROLE_permissions CHECK (ISJSON(permissions) = 1)
  );
END;
GO

IF OBJECT_ID(N'dbo.POI', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.POI (
    id INT NOT NULL CONSTRAINT PK_POI PRIMARY KEY,
    name NVARCHAR(300) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(11, 7) NULL,
    trigger_radius INT NOT NULL CONSTRAINT DF_POI_trigger_radius DEFAULT 100,
    image_url NVARCHAR(2048) NULL,
    active BIT NOT NULL CONSTRAINT DF_POI_active DEFAULT 0,
    CONSTRAINT CK_POI_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT CK_POI_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT CK_POI_trigger_radius CHECK (trigger_radius > 0)
  );
END;
GO

/* Complete the ERD POI columns when upgrading a partially created table. */
IF COL_LENGTH(N'dbo.POI', N'name') IS NULL
  ALTER TABLE dbo.POI ADD name NVARCHAR(300) NOT NULL CONSTRAINT DF_POI_name_upgrade DEFAULT N'' WITH VALUES;
IF COL_LENGTH(N'dbo.POI', N'description') IS NULL
  ALTER TABLE dbo.POI ADD description NVARCHAR(MAX) NOT NULL CONSTRAINT DF_POI_description_upgrade DEFAULT N'' WITH VALUES;
IF COL_LENGTH(N'dbo.POI', N'category') IS NULL
  ALTER TABLE dbo.POI ADD category NVARCHAR(100) NOT NULL CONSTRAINT DF_POI_category_upgrade DEFAULT N'' WITH VALUES;
IF COL_LENGTH(N'dbo.POI', N'latitude') IS NULL
  ALTER TABLE dbo.POI ADD latitude DECIMAL(10, 7) NULL;
IF COL_LENGTH(N'dbo.POI', N'longitude') IS NULL
  ALTER TABLE dbo.POI ADD longitude DECIMAL(11, 7) NULL;
IF COL_LENGTH(N'dbo.POI', N'trigger_radius') IS NULL
  ALTER TABLE dbo.POI ADD trigger_radius INT NOT NULL CONSTRAINT DF_POI_trigger_radius_upgrade DEFAULT 100 WITH VALUES;
IF COL_LENGTH(N'dbo.POI', N'image_url') IS NULL
  ALTER TABLE dbo.POI ADD image_url NVARCHAR(2048) NULL;
IF COL_LENGTH(N'dbo.POI', N'active') IS NULL
  ALTER TABLE dbo.POI ADD active BIT NOT NULL CONSTRAINT DF_POI_active_upgrade DEFAULT 0 WITH VALUES;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_POI_active_name' AND object_id = OBJECT_ID(N'dbo.POI'))
  EXEC sys.sp_executesql N'CREATE INDEX IX_POI_active_name ON dbo.POI(active, name);';
GO

IF OBJECT_ID(N'dbo.POI_LOCALIZATION', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.POI_LOCALIZATION (
    poi_id INT NOT NULL,
    lang NVARCHAR(10) NOT NULL,
    translated_text NVARCHAR(MAX) NOT NULL,
    translated_name NVARCHAR(300) NULL,
    translated_description NVARCHAR(MAX) NULL,
    translated_category NVARCHAR(100) NULL,
    translated_location NVARCHAR(500) NULL,
    audio_url NVARCHAR(2048) NULL,
    CONSTRAINT PK_POI_LOCALIZATION PRIMARY KEY (poi_id, lang),
    CONSTRAINT FK_POI_LOCALIZATION_POI FOREIGN KEY (poi_id) REFERENCES dbo.POI(id) ON DELETE CASCADE
  );
END;
GO

IF COL_LENGTH(N'dbo.POI_LOCALIZATION', N'translated_name') IS NULL
  ALTER TABLE dbo.POI_LOCALIZATION ADD translated_name NVARCHAR(300) NULL;
IF COL_LENGTH(N'dbo.POI_LOCALIZATION', N'translated_description') IS NULL
  ALTER TABLE dbo.POI_LOCALIZATION ADD translated_description NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.POI_LOCALIZATION', N'translated_category') IS NULL
  ALTER TABLE dbo.POI_LOCALIZATION ADD translated_category NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.POI_LOCALIZATION', N'translated_location') IS NULL
  ALTER TABLE dbo.POI_LOCALIZATION ADD translated_location NVARCHAR(500) NULL;
GO

/* Move older POI narration into the ERD localization table before trimming
   app-only fields from dbo.POI. */
IF COL_LENGTH(N'dbo.POI', N'narration') IS NOT NULL
BEGIN
  EXEC sys.sp_executesql N'
    MERGE dbo.POI_LOCALIZATION WITH (HOLDLOCK) AS target
    USING (
      SELECT id AS poi_id, CAST(N''vi'' AS NVARCHAR(10)) AS lang,
        COALESCE(NULLIF(narration, N''''), description) AS translated_text
      FROM dbo.POI
    ) AS source ON source.poi_id = target.poi_id AND source.lang = target.lang
    WHEN NOT MATCHED THEN INSERT (poi_id, lang, translated_text)
      VALUES (source.poi_id, source.lang, source.translated_text);
  ';
END;
GO

/* Merge legacy dbo.Places into the single ERD dbo.POI table, preserve its
   narration as Vietnamese localization, then remove the duplicate table. */
IF OBJECT_ID(N'dbo.Places', N'U') IS NOT NULL
BEGIN
  EXEC sys.sp_executesql N'
    INSERT INTO dbo.POI (id, name, description, category, latitude, longitude, trigger_radius, image_url, active)
    SELECT old.id, old.name, old.description, old.category, old.latitude, old.longitude,
      100, old.image_url, CASE WHEN old.status = N''published'' THEN 1 ELSE 0 END
    FROM dbo.Places AS old
    WHERE NOT EXISTS (SELECT 1 FROM dbo.POI AS current_poi WHERE current_poi.id = old.id);

    INSERT INTO dbo.POI_LOCALIZATION (poi_id, lang, translated_text)
    SELECT old.id, N''vi'', COALESCE(NULLIF(old.narration, N''''), old.description)
    FROM dbo.Places AS old
    INNER JOIN dbo.POI AS current_poi ON current_poi.id = old.id
    WHERE NOT EXISTS (
      SELECT 1 FROM dbo.POI_LOCALIZATION AS localized
      WHERE localized.poi_id = old.id AND localized.lang = N''vi''
    );

    DROP TABLE dbo.Places;
  ';
END;
GO

/* Remove runtime-only columns so POI exactly matches the nine-column ERD. */
DECLARE @poiDefault sysname;
DECLARE @poiColumn sysname;
DECLARE @dropDefaultSql nvarchar(512);
DECLARE poiDefaults CURSOR LOCAL FAST_FORWARD FOR
  SELECT c.name
  FROM sys.default_constraints AS dc
  INNER JOIN sys.columns AS c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
  WHERE dc.parent_object_id = OBJECT_ID(N'dbo.POI')
    AND c.name IN (N'campus_id', N'created_at', N'updated_at');
OPEN poiDefaults;
FETCH NEXT FROM poiDefaults INTO @poiColumn;
WHILE @@FETCH_STATUS = 0
BEGIN
  SELECT @poiDefault = dc.name
  FROM sys.default_constraints AS dc
  INNER JOIN sys.columns AS c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
  WHERE dc.parent_object_id = OBJECT_ID(N'dbo.POI') AND c.name = @poiColumn;
  IF @poiDefault IS NOT NULL
  BEGIN
    SET @dropDefaultSql = N'ALTER TABLE dbo.POI DROP CONSTRAINT ' + QUOTENAME(@poiDefault) + N';';
    EXEC sys.sp_executesql @dropDefaultSql;
  END;
  SET @poiDefault = NULL;
  FETCH NEXT FROM poiDefaults INTO @poiColumn;
END;
CLOSE poiDefaults;
DEALLOCATE poiDefaults;

IF COL_LENGTH(N'dbo.POI', N'narration') IS NOT NULL ALTER TABLE dbo.POI DROP COLUMN narration;
IF COL_LENGTH(N'dbo.POI', N'location') IS NOT NULL ALTER TABLE dbo.POI DROP COLUMN location;
IF COL_LENGTH(N'dbo.POI', N'campus_id') IS NOT NULL ALTER TABLE dbo.POI DROP COLUMN campus_id;
IF COL_LENGTH(N'dbo.POI', N'created_at') IS NOT NULL ALTER TABLE dbo.POI DROP COLUMN created_at;
IF COL_LENGTH(N'dbo.POI', N'updated_at') IS NOT NULL ALTER TABLE dbo.POI DROP COLUMN updated_at;
GO

CREATE OR ALTER VIEW dbo.V_POI_API AS
SELECT p.id, p.name, p.description, p.category, p.latitude, p.longitude,
  p.trigger_radius, p.image_url, p.active,
  COALESCE(vi.translated_text, en.translated_text, p.description) AS narration,
  CASE
    WHEN p.latitude BETWEEN 10.778 AND 10.780 THEN N'campus-1'
    WHEN p.longitude BETWEEN 106.704 AND 106.709 THEN N'campus-2'
    ELSE N'main'
  END AS campus_id,
  CASE
    WHEN p.latitude BETWEEN 10.778 AND 10.780 THEN N'105 Bà Huyện Thanh Quan, TP.HCM'
    WHEN p.longitude BETWEEN 106.704 AND 106.709 THEN N'4 Tôn Đức Thắng, TP.HCM'
    ELSE N'273 An Dương Vương, TP.HCM'
  END AS location
FROM dbo.POI AS p
LEFT JOIN dbo.POI_LOCALIZATION AS vi ON vi.poi_id = p.id AND vi.lang = N'vi'
LEFT JOIN dbo.POI_LOCALIZATION AS en ON en.poi_id = p.id AND en.lang = N'en';
GO

IF OBJECT_ID(N'dbo.UI_TRANSLATION_BUNDLE', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UI_TRANSLATION_BUNDLE (
    namespace NVARCHAR(100) NOT NULL,
    locale NVARCHAR(10) NOT NULL,
    source_hash NVARCHAR(128) NOT NULL,
    status NVARCHAR(20) NOT NULL,
    display_name NVARCHAR(100) NOT NULL CONSTRAINT DF_UI_TRANSLATION_BUNDLE_display_name DEFAULT N'',
    translations_json NVARCHAR(MAX) NULL,
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_UI_TRANSLATION_BUNDLE_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UI_TRANSLATION_BUNDLE PRIMARY KEY (namespace, locale),
    CONSTRAINT CK_UI_TRANSLATION_BUNDLE_status CHECK (status IN (N'pending', N'ready', N'failed'))
  );
END;
GO

IF COL_LENGTH(N'dbo.UI_TRANSLATION_BUNDLE', N'display_name') IS NULL
  ALTER TABLE dbo.UI_TRANSLATION_BUNDLE ADD display_name NVARCHAR(100) NOT NULL CONSTRAINT DF_UI_TRANSLATION_BUNDLE_display_name_upgrade DEFAULT N'' WITH VALUES;
IF COL_LENGTH(N'dbo.UI_TRANSLATION_BUNDLE', N'translations_json') IS NULL
  ALTER TABLE dbo.UI_TRANSLATION_BUNDLE ADD translations_json NVARCHAR(MAX) NULL;
GO

IF OBJECT_ID(N'dbo.CONTENT_DATASET_VERSION', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CONTENT_DATASET_VERSION (
    version_token NVARCHAR(128) NOT NULL CONSTRAINT PK_CONTENT_DATASET_VERSION PRIMARY KEY,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_CONTENT_DATASET_VERSION_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID(N'dbo.AUDIO_TASK', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AUDIO_TASK (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AUDIO_TASK PRIMARY KEY DEFAULT NEWID(),
    state NVARCHAR(30) NOT NULL,
    heartbeat_at DATETIME2(3) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_AUDIO_TASK_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID(N'dbo.ADMIN_USER', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ADMIN_USER (
    id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_ADMIN_USER PRIMARY KEY,
    role_id INT NOT NULL,
    email NVARCHAR(320) NOT NULL CONSTRAINT UQ_ADMIN_USER_email UNIQUE,
    name NVARCHAR(200) NOT NULL,
    password_salt CHAR(32) NOT NULL,
    password_hash CHAR(128) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_ADMIN_USER_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ADMIN_USER_ROLE FOREIGN KEY (role_id) REFERENCES dbo.[ROLE](id)
  );
END;
GO

IF OBJECT_ID(N'dbo.POI_SUBMISSION', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.POI_SUBMISSION (
    id BIGINT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_POI_SUBMISSION PRIMARY KEY,
    submitted_by INT NOT NULL,
    review_status NVARCHAR(20) NOT NULL CONSTRAINT DF_POI_SUBMISSION_review_status DEFAULT N'pending',
    poi_id INT NULL,
    submission_payload NVARCHAR(MAX) NOT NULL CONSTRAINT DF_POI_SUBMISSION_payload DEFAULT N'{}',
    reviewed_by INT NULL,
    review_note NVARCHAR(MAX) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_POI_SUBMISSION_created_at DEFAULT SYSUTCDATETIME(),
    reviewed_at DATETIME2(3) NULL,
    CONSTRAINT CK_POI_SUBMISSION_status CHECK (review_status IN (N'pending', N'approved', N'rejected')),
    CONSTRAINT CK_POI_SUBMISSION_payload CHECK (ISJSON(submission_payload) = 1),
    CONSTRAINT FK_POI_SUBMISSION_submitter FOREIGN KEY (submitted_by) REFERENCES dbo.ADMIN_USER(id),
    CONSTRAINT FK_POI_SUBMISSION_reviewer FOREIGN KEY (reviewed_by) REFERENCES dbo.ADMIN_USER(id),
    CONSTRAINT FK_POI_SUBMISSION_POI FOREIGN KEY (poi_id) REFERENCES dbo.POI(id) ON DELETE SET NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_POI_SUBMISSION_review_status_created_at' AND object_id = OBJECT_ID(N'dbo.POI_SUBMISSION'))
  EXEC sys.sp_executesql N'CREATE INDEX IX_POI_SUBMISSION_review_status_created_at ON dbo.POI_SUBMISSION(review_status, created_at);';
GO

IF OBJECT_ID(N'dbo.VISITOR_SESSION', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.VISITOR_SESSION (
    visitor_id NVARCHAR(100) NOT NULL CONSTRAINT PK_VISITOR_SESSION PRIMARY KEY,
    last_seen DATETIME2(3) NOT NULL,
    current_poi_id INT NULL,
    CONSTRAINT FK_VISITOR_SESSION_POI FOREIGN KEY (current_poi_id) REFERENCES dbo.POI(id) ON DELETE SET NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_VISITOR_SESSION_last_seen' AND object_id = OBJECT_ID(N'dbo.VISITOR_SESSION'))
  EXEC sys.sp_executesql N'CREATE INDEX IX_VISITOR_SESSION_last_seen ON dbo.VISITOR_SESSION(last_seen);';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_VISITOR_SESSION_current_poi_id' AND object_id = OBJECT_ID(N'dbo.VISITOR_SESSION'))
  EXEC sys.sp_executesql N'CREATE INDEX IX_VISITOR_SESSION_current_poi_id ON dbo.VISITOR_SESSION(current_poi_id);';
GO

IF OBJECT_ID(N'dbo.POI_HEARD', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.POI_HEARD (
    poi_id INT NOT NULL,
    visitor_id NVARCHAR(100) NOT NULL,
    first_heard_at DATETIME2(3) NOT NULL CONSTRAINT DF_POI_HEARD_first_heard_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_POI_HEARD PRIMARY KEY (poi_id, visitor_id),
    CONSTRAINT FK_POI_HEARD_POI FOREIGN KEY (poi_id) REFERENCES dbo.POI(id) ON DELETE CASCADE
  );
END;
GO

IF OBJECT_ID(N'dbo.ADMIN_AUTH_SESSION', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ADMIN_AUTH_SESSION (
    token_hash CHAR(64) NOT NULL CONSTRAINT PK_ADMIN_AUTH_SESSION PRIMARY KEY,
    admin_user_id INT NOT NULL,
    expires_at DATETIME2(3) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_ADMIN_AUTH_SESSION_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ADMIN_AUTH_SESSION_ADMIN_USER FOREIGN KEY (admin_user_id) REFERENCES dbo.ADMIN_USER(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ADMIN_AUTH_SESSION_expires_at' AND object_id = OBJECT_ID(N'dbo.ADMIN_AUTH_SESSION'))
  EXEC sys.sp_executesql N'CREATE INDEX IX_ADMIN_AUTH_SESSION_expires_at ON dbo.ADMIN_AUTH_SESSION(expires_at);';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.[ROLE] WHERE name = N'Administrator')
  INSERT INTO dbo.[ROLE] (name, permissions) VALUES (N'Administrator', N'["poi:read","poi:write","poi:review","analytics:read"]');
GO

IF OBJECT_ID(N'dbo.Admins', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.ADMIN_USER)
BEGIN
  EXEC sys.sp_executesql N'
    INSERT INTO dbo.ADMIN_USER (role_id, email, name, password_salt, password_hash)
    SELECT r.id, LOWER(a.email), a.name, a.salt, a.password_hash
    FROM dbo.Admins AS a
    CROSS JOIN dbo.[ROLE] AS r
    WHERE r.name = N''Administrator''
  ';
END;
GO

IF OBJECT_ID(N'dbo.PoiListeners', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.POI_HEARD)
BEGIN
  EXEC sys.sp_executesql N'
    INSERT INTO dbo.POI_HEARD (poi_id, visitor_id, first_heard_at)
    SELECT old.poi_id, old.visitor_id, old.first_heard_at
    FROM dbo.PoiListeners AS old
    INNER JOIN dbo.POI AS poi ON poi.id = old.poi_id
  ';
END;
GO

IF OBJECT_ID(N'dbo.ActiveVisitors', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.VISITOR_SESSION)
BEGIN
  EXEC sys.sp_executesql N'
    INSERT INTO dbo.VISITOR_SESSION (visitor_id, last_seen, current_poi_id)
    SELECT old.visitor_id, old.last_seen, poi.id
    FROM dbo.ActiveVisitors AS old
    LEFT JOIN dbo.POI AS poi ON poi.id = old.current_poi_id
  ';
END;
GO

IF OBJECT_ID(N'dbo.AdminSessions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.ADMIN_AUTH_SESSION)
BEGIN
  EXEC sys.sp_executesql N'
    INSERT INTO dbo.ADMIN_AUTH_SESSION (token_hash, admin_user_id, expires_at, created_at)
    SELECT old.token_hash, admin.id, old.expires_at, old.created_at
    FROM dbo.AdminSessions AS old
    INNER JOIN dbo.ADMIN_USER AS admin ON admin.email = old.admin_email
  ';
END;
GO

/* SECTION 2: PROJECT DATA SEED */
USE [SGUGo];
GO
SET NOCOUNT ON;
GO

/* 1. ROLE */
IF NOT EXISTS (SELECT 1 FROM dbo.[ROLE] WHERE name = N'Administrator')
  INSERT INTO dbo.[ROLE] (name, permissions)
  VALUES (N'Administrator', N'["poi:read","poi:write","poi:review","analytics:read"]');
GO

/* 2. POI - 27 địa điểm đang published (active = 1) */
MERGE dbo.POI AS target
USING (VALUES
  (1, N'Tòa nhà chính SGU - Tòa C', N'Địa điểm Tòa nhà chính SGU - Tòa C tại 273 An Dương Vương, TP.HCM. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7599881 AS DECIMAL(10,7)), CAST(106.6821408 AS DECIMAL(11,7)), N'Địa điểm Tòa nhà chính SGU - Tòa C tại 273 An Dương Vương, TP.HCM. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'273 An Dương Vương, TP.HCM', N'main', N'/src/assets/toa-c-co-so-chinh.jpg'),
  (2, N'Trung tâm học liệu - KLF', N'Địa điểm Trung tâm học liệu - KLF tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7598463 AS DECIMAL(10,7)), CAST(106.6825061 AS DECIMAL(11,7)), N'Địa điểm Trung tâm học liệu - KLF tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/klf-co-so-chinh.jpg'),
  (5, N'Sân bóng chuyền', N'Địa điểm Sân bóng chuyền tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Thể thao', CAST(10.7597542 AS DECIMAL(10,7)), CAST(106.6823477 AS DECIMAL(11,7)), N'Địa điểm Sân bóng chuyền tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/san-bong-chuyen-co-so-chinh.jpg'),
  (6, N'Căn tin', N'Địa điểm Căn tin tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Ẩm thực', CAST(10.7596441 AS DECIMAL(10,7)), CAST(106.6819978 AS DECIMAL(11,7)), N'Địa điểm Căn tin tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/cantin-co-so-chinh.jpg'),
  (7, N'Khu B', N'Địa điểm Khu B tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7594868 AS DECIMAL(10,7)), CAST(106.6823563 AS DECIMAL(11,7)), N'Địa điểm Khu B tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/sgu-building.png'),
  (8, N'Phòng Khảo thí và Đảm bảo chất lượng giáo dục', N'Địa điểm Phòng Khảo thí và Đảm bảo chất lượng giáo dục tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7592293 AS DECIMAL(10,7)), CAST(106.6829477 AS DECIMAL(11,7)), N'Địa điểm Phòng Khảo thí và Đảm bảo chất lượng giáo dục tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/khu-hieu-bo-co-so-chinh.jpg'),
  (9, N'Sân bóng đá', N'Địa điểm Sân bóng đá tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Thể thao', CAST(10.7596453 AS DECIMAL(10,7)), CAST(106.6814334 AS DECIMAL(11,7)), N'Địa điểm Sân bóng đá tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/san-bong-da-co-so-chinh.jpg'),
  (10, N'Nhà đa năng - sân bóng rổ', N'Địa điểm Nhà đa năng - sân bóng rổ tại Nhà đa năng, Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Thể thao', CAST(10.7595776 AS DECIMAL(10,7)), CAST(106.6818120 AS DECIMAL(11,7)), N'Địa điểm Nhà đa năng - sân bóng rổ tại Nhà đa năng, Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Nhà đa năng, Cơ sở chính SGU', N'main', N'/src/assets/san-bong-ro-co-so-chinh.jpg'),
  (11, N'Nhà đa năng - sân cầu lông', N'Địa điểm Nhà đa năng - sân cầu lông tại Nhà đa năng, Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Thể thao', CAST(10.7594808 AS DECIMAL(10,7)), CAST(106.6815304 AS DECIMAL(11,7)), N'Địa điểm Nhà đa năng - sân cầu lông tại Nhà đa năng, Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Nhà đa năng, Cơ sở chính SGU', N'main', N'/src/assets/san-cau-long-co-so-chinh.jpg'),
  (12, N'Nhà đa năng - khu vực bóng bàn', N'Địa điểm Nhà đa năng - khu vực bóng bàn tại Nhà đa năng, Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Thể thao', CAST(10.7593168 AS DECIMAL(10,7)), CAST(106.6815820 AS DECIMAL(11,7)), N'Địa điểm Nhà đa năng - khu vực bóng bàn tại Nhà đa năng, Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Nhà đa năng, Cơ sở chính SGU', N'main', N'/src/assets/bong-ban-co-so-chinh.jpg'),
  (13, N'Tòa E', N'Địa điểm Tòa E tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7590566 AS DECIMAL(10,7)), CAST(106.6818267 AS DECIMAL(11,7)), N'Địa điểm Tòa E tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/toa-e-co-so-chinh.jpg'),
  (14, N'Tòa A', N'Địa điểm Tòa A tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7590928 AS DECIMAL(10,7)), CAST(106.6824102 AS DECIMAL(11,7)), N'Địa điểm Tòa A tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/toa-a-co-so-chinh.jpg'),
  (15, N'Tòa nhà hội trường A', N'Địa điểm Tòa nhà hội trường A tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7596295 AS DECIMAL(10,7)), CAST(106.6830846 AS DECIMAL(11,7)), N'Địa điểm Tòa nhà hội trường A tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/hoi-truong-a-co-so-chinh.jpg'),
  (16, N'Khu tự học (1)', N'Địa điểm Khu tự học (1) tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7600059 AS DECIMAL(10,7)), CAST(106.6825531 AS DECIMAL(11,7)), N'Địa điểm Khu tự học (1) tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/khu-tu-hoc-1-co-so-chinh.jpg'),
  (17, N'Khu tự học (2)', N'Địa điểm Khu tự học (2) tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7597489 AS DECIMAL(10,7)), CAST(106.6826517 AS DECIMAL(11,7)), N'Địa điểm Khu tự học (2) tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/khu-tu-hoc-1-co-so-chinh.jpg'),
  (18, N'Hội trường C', N'Địa điểm Hội trường C tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7600893 AS DECIMAL(10,7)), CAST(106.6824411 AS DECIMAL(11,7)), N'Địa điểm Hội trường C tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/sgu-building.png'),
  (19, N'Hội trường B', N'Địa điểm Hội trường B tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7596223 AS DECIMAL(10,7)), CAST(106.6826235 AS DECIMAL(11,7)), N'Địa điểm Hội trường B tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/sgu-building.png'),
  (20, N'Khu Hiệu Bộ - HB', N'Địa điểm Khu Hiệu Bộ - HB tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7604700 AS DECIMAL(10,7)), CAST(106.6822488 AS DECIMAL(11,7)), N'Địa điểm Khu Hiệu Bộ - HB tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/khu-hieu-bo-co-so-chinh.jpg'),
  (21, N'Tòa D', N'Địa điểm Tòa D tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7602771 AS DECIMAL(10,7)), CAST(106.6817602 AS DECIMAL(11,7)), N'Địa điểm Tòa D tại Cơ sở chính SGU. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở chính SGU', N'main', N'/src/assets/toa-d-co-so-chinh.jpg'),
  (22, N'Tòa A', N'Địa điểm Tòa A tại 105 Bà Huyện Thanh Quan, TP.HCM. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7792360 AS DECIMAL(10,7)), CAST(106.6845872 AS DECIMAL(11,7)), N'Địa điểm Tòa A tại 105 Bà Huyện Thanh Quan, TP.HCM. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'105 Bà Huyện Thanh Quan, TP.HCM', N'campus-1', N'/src/assets/toa-a-coso-1.jpg'),
  (23, N'Khu tự học', N'Địa điểm Khu tự học tại Cơ sở 1. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Học tập', CAST(10.7792749 AS DECIMAL(10,7)), CAST(106.6842995 AS DECIMAL(11,7)), N'Địa điểm Khu tự học tại Cơ sở 1. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở 1', N'campus-1', N'/src/assets/sgu-building.png'),
  (24, N'Tòa B', N'Địa điểm Tòa B tại Cơ sở 1. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7792782 AS DECIMAL(10,7)), CAST(106.6838912 AS DECIMAL(11,7)), N'Địa điểm Tòa B tại Cơ sở 1. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở 1', N'campus-1', N'/src/assets/toa-b-coso-1.jpg'),
  (25, N'Tòa C', N'Địa điểm Tòa C tại Cơ sở 1. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7790786 AS DECIMAL(10,7)), CAST(106.6835217 AS DECIMAL(11,7)), N'Địa điểm Tòa C tại Cơ sở 1. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở 1', N'campus-1', N'/src/assets/toa-c-coso-1.jpg'),
  (26, N'Căn tin', N'Địa điểm Căn tin tại Cơ sở 1. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Ẩm thực', CAST(10.7791563 AS DECIMAL(10,7)), CAST(106.6834721 AS DECIMAL(11,7)), N'Địa điểm Căn tin tại Cơ sở 1. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở 1', N'campus-1', N'/src/assets/cantin-coso-1.jpg'),
  (27, N'Tòa B', N'Địa điểm Tòa B tại 4 Tôn Đức Thắng, TP.HCM. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7829783 AS DECIMAL(10,7)), CAST(106.7061686 AS DECIMAL(11,7)), N'Địa điểm Tòa B tại 4 Tôn Đức Thắng, TP.HCM. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'4 Tôn Đức Thắng, TP.HCM', N'campus-2', N'/src/assets/sgu-building.png'),
  (28, N'Tòa A', N'Địa điểm Tòa A tại Cơ sở 2. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7831245 AS DECIMAL(10,7)), CAST(106.7059575 AS DECIMAL(11,7)), N'Địa điểm Tòa A tại Cơ sở 2. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở 2', N'campus-2', N'/src/assets/sgu-building.png'),
  (29, N'Tòa C', N'Địa điểm Tòa C tại Cơ sở 2. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Kiến trúc', CAST(10.7836067 AS DECIMAL(10,7)), CAST(106.7067301 AS DECIMAL(11,7)), N'Địa điểm Tòa C tại Cơ sở 2. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.', N'Cơ sở 2', N'campus-2', N'/src/assets/sgu-building.png')
) AS source (id, name, description, category, latitude, longitude, narration, location, campus_id, image_url)
ON target.id = source.id
/* Replace legacy hotlinked photos with the project's checked-in POI images. */
WHEN MATCHED AND (target.image_url IS NULL OR target.image_url LIKE N'https://images.unsplash.com/%') THEN
  UPDATE SET image_url = source.image_url
WHEN NOT MATCHED BY TARGET THEN
  INSERT (id, name, description, category, latitude, longitude, image_url, active)
  VALUES (source.id, source.name, source.description, source.category, source.latitude, source.longitude,
          source.image_url, 1);
GO

/* Retain Vietnamese narration in POI_LOCALIZATION, where the ERD places it. */
INSERT INTO dbo.POI_LOCALIZATION (poi_id, lang, translated_text)
SELECT p.id, N'vi', p.description
FROM dbo.POI AS p
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.POI_LOCALIZATION AS l WHERE l.poi_id = p.id AND l.lang = N'vi'
);
GO

/* 3. POI_LOCALIZATION - lời thuyết minh tiếng Anh của từng POI */
MERGE dbo.POI_LOCALIZATION AS target
USING (VALUES
  (1, N'en', N'You are at Building C, one of the recognizable landmarks on Saigon University’s main campus. Notice the details of the facade and its distinctive arched entrance before continuing to your next stop.'),
  (2, N'en', N'This is the KLF Learning Resource Center, a space for studying and consulting learning materials. Check the posted opening hours and visitor guidance if you plan to go inside.'),
  (5, N'en', N'This is the outdoor volleyball court on the main campus, used for exercise and sports activities. Please check the court schedule and give way to classes or teams that are practicing.'),
  (6, N'en', N'You are at the main campus cafeteria, where students can take a break and have a meal. Menus and service hours may change, so please check with the counter when you visit.'),
  (7, N'en', N'This is Building B on the main campus. Check the building signs and directory near the entrances to find the classroom or office you need.'),
  (8, N'en', N'This is the Office of Testing and Educational Quality Assurance. For assistance or contact details, please check the information posted at the office.'),
  (9, N'en', N'You are at the main campus football field, an outdoor space for sports and recreation. Please check the schedule and take care when a match or practice is in progress.'),
  (10, N'en', N'This is the basketball court in the main campus multipurpose hall. Please check the schedule before entering for practice or a game.'),
  (11, N'en', N'This is the badminton area in the multipurpose hall. Follow the court markings and check the booking or usage information posted at the venue.'),
  (12, N'en', N'This is the table tennis area in the multipurpose hall. Please use the tables and shared equipment carefully and follow the university’s facility guidelines.'),
  (13, N'en', N'You are at Building E on the main campus. Check the floor directory and room numbers to find the classroom or area you are looking for.'),
  (14, N'en', N'This is Building A on the main campus. Check the floor directory and room numbers to find your destination, or ask the staff for guidance.'),
  (15, N'en', N'This is Auditorium A, a venue for university programs and events. Check the event information for its time, entrance, and seating arrangements.'),
  (16, N'en', N'You are at Self-Study Area 1 on the main campus. It is intended for individual study and group work. Please keep your voice low and follow the posted rules.'),
  (17, N'en', N'This is Self-Study Area 2 on the main campus. You can use it to review lessons or work with classmates. Please take care of the furniture and shared space.'),
  (18, N'en', N'You are at Auditorium C on the main campus. Check the notice board at the entrance for the schedule and visitor guidance.'),
  (19, N'en', N'This is Auditorium B on the main campus. If you are attending an event, check the notice at the entrance for its start time and the correct entry area.'),
  (20, N'en', N'You are at the Administration Building, marked HB on the main campus map. Visitors should check the guidance board and follow the instructions at the entrance.'),
  (21, N'en', N'This is Building D on the main campus. Use the building sign, floor directory, and room numbers to find your destination, then continue your campus visit with the map.'),
  (22, N'en', N'You are at Building A on Campus 1. Check the directory and room numbers to find the classroom or office you need.'),
  (23, N'en', N'This is the study area on Campus 1. You can focus on your work or study with classmates. Please keep the area quiet and follow its rules.'),
  (24, N'en', N'This is Building B on Campus 1. Check the room numbers and signs along the corridors to find the classroom or office you are looking for.'),
  (25, N'en', N'This is Building C on Campus 1. Check the building sign and floor directory to find your classroom before moving on.'),
  (26, N'en', N'You are at the cafeteria on Campus 1. You can stop here for a meal or a short break. Check the service hours and menu at the counter.'),
  (27, N'en', N'This is Building B on Campus 2. Use the building signs and directory to find the classroom or office you need.'),
  (28, N'en', N'You are at Building A on Campus 2. Check the room numbers and signs to find the right route to your destination.'),
  (29, N'en', N'This is Building C on Campus 2. Check the directory in the area to find the classroom or university office you want to visit.')
) AS source (poi_id, lang, translated_text)
ON target.poi_id = source.poi_id AND target.lang = source.lang
WHEN NOT MATCHED BY TARGET THEN
  INSERT (poi_id, lang, translated_text)
  VALUES (source.poi_id, source.lang, source.translated_text);
GO

/* 3b. POI labels and concise descriptions for English, Japanese, Korean and Chinese. */
MERGE dbo.POI_LOCALIZATION AS target
USING (
  SELECT seed.poi_id, seed.lang, seed.translated_name, seed.translated_category,
    CASE seed.lang
      WHEN N'en' THEN N'Explore ' + seed.translated_name + N' on the SGU campus. Check the information posted at the location before your visit.'
      WHEN N'ja' THEN N'SGUのキャンパスにある「' + seed.translated_name + N'」です。訪問時は現地の案内をご確認ください。'
      WHEN N'ko' THEN N'SGU 캠퍼스에 있는 ' + seed.translated_name + N'입니다. 방문 시 현장 안내를 확인해 주세요.'
      ELSE N'SGU校园内的' + seed.translated_name + N'。参观时请留意现场指引。'
    END AS translated_description,
    CASE
      WHEN poi.latitude BETWEEN 10.778 AND 10.780 THEN
        CASE seed.lang WHEN N'en' THEN N'105 Ba Huyen Thanh Quan Street, Ho Chi Minh City'
          WHEN N'ja' THEN N'ホーチミン市 バー・フエン・タイン・クアン通り105番地'
          WHEN N'ko' THEN N'호치민시 바후옌타인꽌 거리 105'
          ELSE N'胡志明市巴辉县清官街105号' END
      WHEN poi.longitude BETWEEN 106.704 AND 106.709 THEN
        CASE seed.lang WHEN N'en' THEN N'4 Ton Duc Thang Street, Ho Chi Minh City'
          WHEN N'ja' THEN N'ホーチミン市 トン・ドゥック・タン通り4番地'
          WHEN N'ko' THEN N'호치민시 똔득탕 거리 4'
          ELSE N'胡志明市尊德胜街4号' END
      ELSE
        CASE seed.lang WHEN N'en' THEN N'273 An Duong Vuong Street, Ho Chi Minh City'
          WHEN N'ja' THEN N'ホーチミン市 アンズオンブオン通り273番地'
          WHEN N'ko' THEN N'호치민시 안즈엉브엉 거리 273'
          ELSE N'胡志明市安阳王街273号' END
    END AS translated_location
  FROM (VALUES
    (1, N'en', N'SGU Main Building – Building C', N'Architecture'), (2, N'en', N'KLF Learning Resource Center', N'Study'),
    (5, N'en', N'Volleyball Court', N'Sports'), (6, N'en', N'Main Campus Cafeteria', N'Food'),
    (7, N'en', N'Building B', N'Study'), (8, N'en', N'Testing and Educational Quality Assurance Office', N'Study'),
    (9, N'en', N'Football Field', N'Sports'), (10, N'en', N'Multipurpose Hall – Basketball Court', N'Sports'),
    (11, N'en', N'Multipurpose Hall – Badminton Court', N'Sports'), (12, N'en', N'Multipurpose Hall – Table Tennis Area', N'Sports'),
    (13, N'en', N'Building E', N'Architecture'), (14, N'en', N'Building A', N'Architecture'),
    (15, N'en', N'Auditorium A', N'Study'), (16, N'en', N'Self-Study Area 1', N'Study'),
    (17, N'en', N'Self-Study Area 2', N'Study'), (18, N'en', N'Auditorium C', N'Study'),
    (19, N'en', N'Auditorium B', N'Study'), (20, N'en', N'Administration Building', N'Architecture'),
    (21, N'en', N'Building D', N'Architecture'), (22, N'en', N'Building A – Campus 1', N'Architecture'),
    (23, N'en', N'Study Area – Campus 1', N'Study'), (24, N'en', N'Building B – Campus 1', N'Architecture'),
    (25, N'en', N'Building C – Campus 1', N'Architecture'), (26, N'en', N'Cafeteria – Campus 1', N'Food'),
    (27, N'en', N'Building B – Campus 2', N'Architecture'), (28, N'en', N'Building A – Campus 2', N'Architecture'),
    (29, N'en', N'Building C – Campus 2', N'Architecture'),
    (1, N'ja', N'SGU本館 C棟', N'建築'), (2, N'ja', N'学習リソースセンター（KLF）', N'学習'),
    (5, N'ja', N'バレーボールコート', N'スポーツ'), (6, N'ja', N'食堂', N'飲食'),
    (7, N'ja', N'B棟', N'学習'), (8, N'ja', N'試験・教育品質保証室', N'学習'),
    (9, N'ja', N'サッカー場', N'スポーツ'), (10, N'ja', N'体育館・バスケットボールコート', N'スポーツ'),
    (11, N'ja', N'体育館・バドミントンコート', N'スポーツ'), (12, N'ja', N'体育館・卓球エリア', N'スポーツ'),
    (13, N'ja', N'E棟', N'建築'), (14, N'ja', N'A棟', N'建築'),
    (15, N'ja', N'A講堂', N'学習'), (16, N'ja', N'自習スペース（1）', N'学習'),
    (17, N'ja', N'自習スペース（2）', N'学習'), (18, N'ja', N'C講堂', N'学習'),
    (19, N'ja', N'B講堂', N'学習'), (20, N'ja', N'管理棟', N'建築'),
    (21, N'ja', N'D棟', N'建築'), (22, N'ja', N'A棟（キャンパス1）', N'建築'),
    (23, N'ja', N'自習スペース（キャンパス1）', N'学習'), (24, N'ja', N'B棟（キャンパス1）', N'建築'),
    (25, N'ja', N'C棟（キャンパス1）', N'建築'), (26, N'ja', N'食堂（キャンパス1）', N'飲食'),
    (27, N'ja', N'B棟（キャンパス2）', N'建築'), (28, N'ja', N'A棟（キャンパス2）', N'建築'),
    (29, N'ja', N'C棟（キャンパス2）', N'建築'),
    (1, N'ko', N'SGU 본관 C동', N'건축'), (2, N'ko', N'학습자료센터(KLF)', N'학습'),
    (5, N'ko', N'배구 코트', N'스포츠'), (6, N'ko', N'학생 식당', N'음식'),
    (7, N'ko', N'B동', N'학습'), (8, N'ko', N'시험·교육품질보증실', N'학습'),
    (9, N'ko', N'축구장', N'스포츠'), (10, N'ko', N'다목적 체육관 농구 코트', N'스포츠'),
    (11, N'ko', N'다목적 체육관 배드민턴 코트', N'스포츠'), (12, N'ko', N'다목적 체육관 탁구 공간', N'스포츠'),
    (13, N'ko', N'E동', N'건축'), (14, N'ko', N'A동', N'건축'),
    (15, N'ko', N'A 강당', N'학습'), (16, N'ko', N'자율학습 공간 1', N'학습'),
    (17, N'ko', N'자율학습 공간 2', N'학습'), (18, N'ko', N'C 강당', N'학습'),
    (19, N'ko', N'B 강당', N'학습'), (20, N'ko', N'행정동', N'건축'),
    (21, N'ko', N'D동', N'건축'), (22, N'ko', N'캠퍼스 1 A동', N'건축'),
    (23, N'ko', N'캠퍼스 1 자율학습 공간', N'학습'), (24, N'ko', N'캠퍼스 1 B동', N'건축'),
    (25, N'ko', N'캠퍼스 1 C동', N'건축'), (26, N'ko', N'캠퍼스 1 학생 식당', N'음식'),
    (27, N'ko', N'캠퍼스 2 B동', N'건축'), (28, N'ko', N'캠퍼스 2 A동', N'건축'),
    (29, N'ko', N'캠퍼스 2 C동', N'건축'),
    (1, N'zh', N'SGU主楼C座', N'建筑'), (2, N'zh', N'学习资源中心（KLF）', N'学习'),
    (5, N'zh', N'排球场', N'运动'), (6, N'zh', N'学生食堂', N'餐饮'),
    (7, N'zh', N'B栋', N'学习'), (8, N'zh', N'考试与教育质量保障办公室', N'学习'),
    (9, N'zh', N'足球场', N'运动'), (10, N'zh', N'多功能馆篮球场', N'运动'),
    (11, N'zh', N'多功能馆羽毛球场', N'运动'), (12, N'zh', N'多功能馆乒乓球区', N'运动'),
    (13, N'zh', N'E栋', N'建筑'), (14, N'zh', N'A栋', N'建筑'),
    (15, N'zh', N'A礼堂', N'学习'), (16, N'zh', N'自习区（1）', N'学习'),
    (17, N'zh', N'自习区（2）', N'学习'), (18, N'zh', N'C礼堂', N'学习'),
    (19, N'zh', N'B礼堂', N'学习'), (20, N'zh', N'行政楼', N'建筑'),
    (21, N'zh', N'D栋', N'建筑'), (22, N'zh', N'1号校区A栋', N'建筑'),
    (23, N'zh', N'1号校区自习区', N'学习'), (24, N'zh', N'1号校区B栋', N'建筑'),
    (25, N'zh', N'1号校区C栋', N'建筑'), (26, N'zh', N'1号校区学生食堂', N'餐饮'),
    (27, N'zh', N'2号校区B栋', N'建筑'), (28, N'zh', N'2号校区A栋', N'建筑'),
    (29, N'zh', N'2号校区C栋', N'建筑')
  ) AS seed (poi_id, lang, translated_name, translated_category)
  INNER JOIN dbo.POI AS poi ON poi.id = seed.poi_id
) AS source
ON target.poi_id = source.poi_id AND target.lang = source.lang
WHEN MATCHED THEN UPDATE SET
  translated_name = COALESCE(target.translated_name, source.translated_name),
  translated_description = COALESCE(target.translated_description, source.translated_description),
  translated_category = COALESCE(target.translated_category, source.translated_category),
  translated_location = COALESCE(target.translated_location, source.translated_location)
WHEN NOT MATCHED BY TARGET THEN
  INSERT (poi_id, lang, translated_text, translated_name, translated_description, translated_category, translated_location)
  VALUES (source.poi_id, source.lang, source.translated_description, source.translated_name,
          source.translated_description, source.translated_category, source.translated_location);
GO

/* 4. UI_TRANSLATION_BUNDLE - 5 ngôn ngữ giao diện (source_hash = SHA-256 của translations.ts) */
MERGE dbo.UI_TRANSLATION_BUNDLE AS target
USING (VALUES
  (N'app', N'vi', N'5a68de52cbbb81f40c12c2fef5fcdb6ab29c92d4f2681083ce45201b7ce4b7a1', N'ready'),
  (N'app', N'en', N'5a68de52cbbb81f40c12c2fef5fcdb6ab29c92d4f2681083ce45201b7ce4b7a1', N'ready'),
  (N'app', N'ko', N'5a68de52cbbb81f40c12c2fef5fcdb6ab29c92d4f2681083ce45201b7ce4b7a1', N'ready'),
  (N'app', N'ja', N'5a68de52cbbb81f40c12c2fef5fcdb6ab29c92d4f2681083ce45201b7ce4b7a1', N'ready'),
  (N'app', N'zh', N'5a68de52cbbb81f40c12c2fef5fcdb6ab29c92d4f2681083ce45201b7ce4b7a1', N'ready')
) AS source (namespace, locale, source_hash, status)
ON target.namespace = source.namespace AND target.locale = source.locale
WHEN NOT MATCHED BY TARGET THEN
  INSERT (namespace, locale, source_hash, status)
  VALUES (source.namespace, source.locale, source.source_hash, source.status);
GO

/* 5. CONTENT_DATASET_VERSION */
IF NOT EXISTS (SELECT 1 FROM dbo.CONTENT_DATASET_VERSION WHERE version_token = N'sgu-poi-seed-1')
  INSERT INTO dbo.CONTENT_DATASET_VERSION (version_token) VALUES (N'sgu-poi-seed-1');
GO

/* 6. Kiểm tra: số dòng của từng bảng */
SELECT t.name AS [table], SUM(p.rows) AS [rows]
FROM sys.tables AS t
JOIN sys.partitions AS p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
WHERE t.schema_id = SCHEMA_ID(N'dbo')
GROUP BY t.name
ORDER BY t.name;
GO

SELECT id, name, category, latitude, longitude, trigger_radius, image_url, active FROM dbo.POI ORDER BY id;
SELECT poi_id, lang, LEFT(translated_text, 60) AS translated_text FROM dbo.POI_LOCALIZATION ORDER BY poi_id;
GO

/* SECTION 3: POI DESCRIPTIONS AND TRIGGER RADII */
/* ============================================================================
   SGU Go - BỔ SUNG DỮ LIỆU CHO BẢNG dbo.POI (27 địa điểm).
   Chạy SAU schema.sql và seed.sql. Có thể chạy lại nhiều lần.

   Trước đây: description = narration = câu mẫu chung ("Địa điểm X tại Y...") và
   trigger_radius đều là 100 (mặc định). Script này:
     - Ghi mô tả (description) và lời thuyết minh (narration) tiếng Việt riêng cho
       từng địa điểm (dịch từ nội dung tiếng Anh đã có trong placeTranslations.ts).
     - Đặt trigger_radius (bán kính kích hoạt thuyết minh, đơn vị mét) theo loại
       địa điểm. Đây là GIÁ TRỊ MẪU, cần chỉnh lại khi đo thực tế tại trường.
   Chỉ cập nhật dòng còn là dữ liệu mẫu cũ: dòng nào admin đã sửa sẽ KHÔNG bị ghi đè.
   File lưu UTF-8 có BOM. Nếu chạy bằng sqlcmd thì thêm  -f 65001.
   ========================================================================== */
USE [SGUGo];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'tempdb..#poi_fix') IS NOT NULL DROP TABLE #poi_fix;
CREATE TABLE #poi_fix (
  id INT NOT NULL PRIMARY KEY,
  description NVARCHAR(MAX) NOT NULL,
  narration NVARCHAR(MAX) NOT NULL,
  trigger_radius INT NOT NULL
);

INSERT INTO #poi_fix (id, description, narration, trigger_radius) VALUES
  (1, N'Công trình biểu tượng, gìn giữ nét đặc trưng và lịch sử của Trường Đại học Sài Gòn.', N'Bạn đang đứng trước Tòa C, một trong những công trình dễ nhận biết của cơ sở chính Trường Đại học Sài Gòn. Hãy chú ý các chi tiết mặt tiền và lối vào hình vòm đặc trưng trước khi tiếp tục đến điểm kế tiếp.', 40),
  (2, N'Nơi yên tĩnh để đọc sách, học nhóm và tìm hiểu tài liệu học tập.', N'Đây là Trung tâm học liệu KLF, không gian để học tập và tra cứu tài liệu. Hãy xem giờ mở cửa và hướng dẫn dành cho khách tham quan nếu bạn muốn vào bên trong.', 30),
  (5, N'Sân bóng chuyền ngoài trời tại cơ sở chính của SGU.', N'Đây là sân bóng chuyền ngoài trời ở cơ sở chính, phục vụ tập luyện và các hoạt động thể thao. Vui lòng xem lịch sử dụng sân và nhường chỗ cho các lớp học hoặc đội đang tập.', 30),
  (6, N'Nơi thuận tiện để sinh viên nghỉ ngơi và dùng bữa.', N'Bạn đang ở căn tin cơ sở chính, nơi sinh viên nghỉ giải lao và dùng bữa. Thực đơn và giờ phục vụ có thể thay đổi, vui lòng hỏi tại quầy khi ghé thăm.', 30),
  (7, N'Xem bảng chỉ dẫn tòa nhà và sơ đồ khuôn viên để tìm phòng học và phòng ban của trường.', N'Đây là Khu B ở cơ sở chính. Hãy xem bảng chỉ dẫn và sơ đồ gần các lối vào để tìm phòng học hoặc phòng ban bạn cần.', 30),
  (8, N'Đơn vị của trường phụ trách công tác khảo thí và đảm bảo chất lượng giáo dục.', N'Đây là Phòng Khảo thí và Đảm bảo chất lượng giáo dục. Cần hỗ trợ hoặc thông tin liên hệ, vui lòng xem thông báo niêm yết tại phòng.', 30),
  (9, N'Sân thể thao ngoài trời tại cơ sở chính của SGU.', N'Bạn đang ở sân bóng đá của cơ sở chính, không gian ngoài trời cho thể thao và giải trí. Vui lòng xem lịch sân và chú ý an toàn khi có trận đấu hoặc buổi tập.', 60),
  (10, N'Sân trong nhà dành cho tập luyện và thi đấu bóng rổ.', N'Đây là sân bóng rổ trong nhà đa năng của cơ sở chính. Vui lòng xem lịch sử dụng trước khi vào tập hoặc thi đấu.', 30),
  (11, N'Các sân cầu lông trong nhà đa năng của trường.', N'Đây là khu vực cầu lông trong nhà đa năng. Hãy theo vạch kẻ sân và xem thông tin đặt sân hoặc sử dụng niêm yết tại đây.', 30),
  (12, N'Khu vực trong nhà để tập và chơi bóng bàn giao hữu.', N'Đây là khu vực bóng bàn trong nhà đa năng. Vui lòng giữ gìn bàn và dụng cụ dùng chung, đồng thời tuân thủ quy định sử dụng cơ sở vật chất của trường.', 30),
  (13, N'Tòa nhà của trường. Dựa vào bảng chỉ dẫn từng tầng và số phòng để tìm nơi cần đến.', N'Bạn đang ở Tòa E của cơ sở chính. Hãy xem bảng chỉ dẫn từng tầng và số phòng để tìm lớp học hoặc khu vực bạn cần.', 40),
  (14, N'Tòa nhà của trường. Xem bảng chỉ dẫn từng tầng và số phòng để định hướng.', N'Đây là Tòa A của cơ sở chính. Hãy xem bảng chỉ dẫn từng tầng và số phòng để tìm nơi cần đến, hoặc hỏi nhân viên để được hướng dẫn.', 40),
  (15, N'Địa điểm tổ chức sự kiện, chương trình và hoạt động chung của trường.', N'Đây là Hội trường A, nơi diễn ra các chương trình và sự kiện của trường. Hãy xem thông tin sự kiện để biết thời gian, lối vào và sắp xếp chỗ ngồi.', 30),
  (16, N'Không gian học cá nhân và làm việc nhóm. Vui lòng giữ yên lặng.', N'Bạn đang ở Khu tự học 1 của cơ sở chính, dành cho học cá nhân và làm việc nhóm. Vui lòng nói nhỏ và tuân thủ nội quy niêm yết.', 30),
  (17, N'Không gian chung để ôn bài và làm việc cùng bạn học.', N'Đây là Khu tự học 2 của cơ sở chính. Bạn có thể ôn bài hoặc làm việc cùng bạn học. Vui lòng giữ gìn bàn ghế và không gian chung.', 30),
  (18, N'Địa điểm của trường dành cho các buổi họp và hoạt động.', N'Bạn đang ở Hội trường C của cơ sở chính. Hãy xem bảng thông báo ở lối vào để biết lịch và hướng dẫn dành cho khách.', 30),
  (19, N'Địa điểm của trường dành cho các chương trình và sự kiện.', N'Đây là Hội trường B của cơ sở chính. Nếu bạn tham dự sự kiện, hãy xem thông báo ở lối vào để biết giờ bắt đầu và khu vực vào đúng.', 30),
  (20, N'Các phòng ban hành chính của trường. Làm theo biển chỉ dẫn dành cho khách ở lối vào.', N'Bạn đang ở Khu Hiệu bộ, ký hiệu HB trên bản đồ cơ sở chính. Khách vui lòng xem bảng hướng dẫn và làm theo chỉ dẫn tại lối vào.', 40),
  (21, N'Dựa vào biển tòa nhà, bảng chỉ dẫn từng tầng và số phòng để tìm nơi cần đến.', N'Đây là Tòa D của cơ sở chính. Hãy dùng biển tòa nhà, bảng chỉ dẫn từng tầng và số phòng để tìm nơi cần đến, rồi tiếp tục tham quan bằng bản đồ.', 40),
  (22, N'Xem bảng chỉ dẫn và số phòng để tìm phòng học hoặc phòng ban.', N'Bạn đang ở Tòa A của Cơ sở 1. Hãy xem bảng chỉ dẫn và số phòng để tìm phòng học hoặc phòng ban cần đến.', 40),
  (23, N'Nơi học yên tĩnh hoặc làm việc cùng bạn học. Vui lòng tuân thủ nội quy phòng.', N'Đây là khu tự học của Cơ sở 1. Bạn có thể tập trung làm việc hoặc học cùng bạn. Vui lòng giữ yên lặng và tuân thủ nội quy.', 30),
  (24, N'Dựa vào biển phòng và bảng chỉ dẫn để tìm đúng phòng học hoặc phòng ban.', N'Đây là Tòa B của Cơ sở 1. Hãy xem số phòng và biển chỉ dẫn dọc hành lang để tìm phòng học hoặc phòng ban bạn cần.', 40),
  (25, N'Tòa nhà của trường. Xem biển tòa nhà và bảng chỉ dẫn từng tầng trước khi đi.', N'Đây là Tòa C của Cơ sở 1. Hãy xem biển tòa nhà và bảng chỉ dẫn từng tầng để tìm lớp học trước khi di chuyển tiếp.', 40),
  (26, N'Nơi nghỉ ngơi và dùng bữa tại Cơ sở 1.', N'Bạn đang ở căn tin Cơ sở 1. Bạn có thể ghé dùng bữa hoặc nghỉ giải lao. Hãy xem giờ phục vụ và thực đơn tại quầy.', 30),
  (27, N'Dựa vào biển tòa nhà và bảng chỉ dẫn từng tầng để tìm phòng học hoặc phòng ban.', N'Đây là Tòa B của Cơ sở 2. Hãy dùng biển tòa nhà và bảng chỉ dẫn để tìm phòng học hoặc phòng ban bạn cần.', 40),
  (28, N'Xem số phòng và biển chỉ dẫn dành cho khách để định hướng.', N'Bạn đang ở Tòa A của Cơ sở 2. Hãy xem số phòng và biển chỉ dẫn để tìm đường đến nơi cần đến.', 40),
  (29, N'Dùng bảng chỉ dẫn tòa nhà để tìm phòng học hoặc phòng ban của trường.', N'Đây là Tòa C của Cơ sở 2. Hãy xem bảng chỉ dẫn trong khu vực để tìm phòng học hoặc phòng ban bạn muốn đến.', 40);

UPDATE p SET p.description = f.description
FROM dbo.POI AS p
JOIN #poi_fix AS f ON f.id = p.id
WHERE p.description LIKE N'Địa điểm %. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.';
PRINT CONCAT(N'Đã cập nhật mô tả: ', @@ROWCOUNT, N' dòng');

MERGE dbo.POI_LOCALIZATION WITH (HOLDLOCK) AS target
USING (
  SELECT poi_id = f.id, lang = CAST(N'vi' AS NVARCHAR(10)), translated_text = f.narration
  FROM #poi_fix AS f
) AS source ON source.poi_id = target.poi_id AND source.lang = target.lang
WHEN MATCHED THEN UPDATE SET translated_text = source.translated_text
WHEN NOT MATCHED THEN INSERT (poi_id, lang, translated_text)
  VALUES (source.poi_id, source.lang, source.translated_text);

UPDATE p SET
  p.trigger_radius = f.trigger_radius
FROM dbo.POI AS p
JOIN #poi_fix AS f ON f.id = p.id
WHERE p.trigger_radius = 100;
PRINT CONCAT(N'Đã cập nhật trigger_radius: ', @@ROWCOUNT, N' dòng');

DROP TABLE #poi_fix;
GO

/* Kiểm tra */
SELECT p.id, p.name, p.category, p.trigger_radius,
  LEFT(p.description, 50) AS description, LEFT(vi.translated_text, 50) AS narration
FROM dbo.POI AS p
LEFT JOIN dbo.POI_LOCALIZATION AS vi ON vi.poi_id = p.id AND vi.lang = N'vi'
ORDER BY p.id;
GO

