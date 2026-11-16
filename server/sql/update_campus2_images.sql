/* SGU Go: real photos for Campus 2 buildings A, B and C (files in src/assets). Safe to re-run. */
USE [SGUGo];
GO

UPDATE dbo.POI SET image_url = N'/src/assets/toa-b-coso-2.webp' WHERE id = 27;
UPDATE dbo.POI SET image_url = N'/src/assets/toa-a-coso-2.webp' WHERE id = 28;
UPDATE dbo.POI SET image_url = N'/src/assets/toa-c-coso-2.webp' WHERE id = 29;
GO
