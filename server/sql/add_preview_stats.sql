/* SGU Go: preview listens
   Counts devices that listened to a place's narration while outside its radius
   ("preview"), separately from in-range listens (dbo.POI_HEARD). Safe to run more than once.
   Run in SSMS (Windows authentication) against the SGUGo database. */
USE [SGUGo];
GO

IF OBJECT_ID(N'dbo.POI_PREVIEW', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.POI_PREVIEW (
    poi_id INT NOT NULL,
    visitor_id NVARCHAR(100) NOT NULL,
    first_previewed_at DATETIME2(3) NOT NULL CONSTRAINT DF_POI_PREVIEW_first_previewed_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_POI_PREVIEW PRIMARY KEY (poi_id, visitor_id),
    CONSTRAINT FK_POI_PREVIEW_POI FOREIGN KEY (poi_id) REFERENCES dbo.POI(id) ON DELETE CASCADE
  );
END;
GO

IF DATABASE_PRINCIPAL_ID(N'sgu_app') IS NOT NULL
  GRANT SELECT, INSERT ON dbo.POI_PREVIEW TO sgu_app;
GO
