/* SGU Go: wider trigger radius (field test: phones did not auto-play close to a place).
   Small places 30 -> 50 m, buildings 40 -> 60 m, football field 60 -> 80 m.
   Explicit values per place, safe to run more than once. Run in SSMS against SGUGo. */
USE [SGUGo];
GO

UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 1;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 2;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 5;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 6;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 7;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 8;
UPDATE dbo.POI SET trigger_radius = 80 WHERE id = 9;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 10;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 11;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 12;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 13;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 14;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 15;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 16;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 17;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 18;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 19;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 20;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 21;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 22;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 23;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 24;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 25;
UPDATE dbo.POI SET trigger_radius = 50 WHERE id = 26;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 27;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 28;
UPDATE dbo.POI SET trigger_radius = 60 WHERE id = 29;
GO
