/* SGU Go: usage statistics (devices and visits)
   Adds two tables used by the admin dashboard. Safe to run more than once.
   Run in SSMS (connected with Windows authentication) against the SGUGo database,
   because the sgu_app login is not allowed to create tables. */
USE [SGUGo];
GO

IF OBJECT_ID(N'dbo.VISITOR_DEVICE', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.VISITOR_DEVICE (
    visitor_id NVARCHAR(100) NOT NULL CONSTRAINT PK_VISITOR_DEVICE PRIMARY KEY,
    device_type NVARCHAR(20) NOT NULL,
    first_seen DATETIME2(3) NOT NULL CONSTRAINT DF_VISITOR_DEVICE_first_seen DEFAULT SYSUTCDATETIME(),
    last_seen DATETIME2(3) NOT NULL,
    visit_count INT NOT NULL CONSTRAINT DF_VISITOR_DEVICE_visit_count DEFAULT 1
  );
END;
GO

IF OBJECT_ID(N'dbo.VISIT_LOG', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.VISIT_LOG (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VISIT_LOG PRIMARY KEY,
    visitor_id NVARCHAR(100) NOT NULL,
    started_at DATETIME2(3) NOT NULL CONSTRAINT DF_VISIT_LOG_started_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_VISIT_LOG_started_at' AND object_id = OBJECT_ID(N'dbo.VISIT_LOG'))
  EXEC sys.sp_executesql N'CREATE INDEX IX_VISIT_LOG_started_at ON dbo.VISIT_LOG(started_at);';
GO

IF DATABASE_PRINCIPAL_ID(N'sgu_app') IS NOT NULL
BEGIN
  GRANT SELECT, INSERT, UPDATE ON dbo.VISITOR_DEVICE TO sgu_app;
  GRANT SELECT, INSERT ON dbo.VISIT_LOG TO sgu_app;
END;
GO
