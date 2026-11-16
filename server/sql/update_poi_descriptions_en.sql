/* SGU Go: English POI descriptions
   Replaces the generic placeholder text ("Explore X on the SGU campus...") in
   dbo.POI_LOCALIZATION (lang = 'en') with the project's written descriptions.
   Safe to run more than once. Run in SSMS against the SGUGo database. Review the
   wording with SGU before production use. */
USE [SGUGo];
GO

UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A landmark building that preserves the character and history of Saigon University.' WHERE poi_id = 1 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A quiet place for reading, group study, and exploring learning resources.' WHERE poi_id = 2 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'An outdoor volleyball court on SGU’s main campus.' WHERE poi_id = 5 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A convenient place for students to take a break and have a meal.' WHERE poi_id = 6 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'Use the building signs and campus directories to find classrooms and university offices.' WHERE poi_id = 7 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'The university office responsible for examinations and educational quality assurance.' WHERE poi_id = 8 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'An outdoor sports field on SGU’s main campus.' WHERE poi_id = 9 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'An indoor court for basketball practice and games.' WHERE poi_id = 10 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'Indoor badminton courts in the university multipurpose hall.' WHERE poi_id = 11 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'An indoor area for table tennis practice and friendly games.' WHERE poi_id = 12 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A campus building. Use the floor directory and room numbers to find your destination.' WHERE poi_id = 13 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A campus building. Check the floor directory and room numbers to find your way around.' WHERE poi_id = 14 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A venue for university events, programs, and shared activities.' WHERE poi_id = 15 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A space for individual study and group work. Please keep the area quiet.' WHERE poi_id = 16 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A shared space for reviewing lessons and working with classmates.' WHERE poi_id = 17 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A university venue for meetings and campus activities.' WHERE poi_id = 18 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A campus venue for university programs and events.' WHERE poi_id = 19 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'The university’s administrative offices. Follow the visitor signs at the entrance.' WHERE poi_id = 20 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'Use the building sign, floor directory, and room numbers to find your destination.' WHERE poi_id = 21 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'Check the directory and room numbers to find a classroom or office.' WHERE poi_id = 22 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A place to study quietly or work with classmates. Please follow the room rules.' WHERE poi_id = 23 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'Use the room signs and directory to find the right classroom or office.' WHERE poi_id = 24 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A campus building. Check the building sign and floor directory before you go.' WHERE poi_id = 25 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'A place to take a break and have a meal on Campus 1.' WHERE poi_id = 26 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'Use the building signs and floor directory to locate a classroom or office.' WHERE poi_id = 27 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'Check the room numbers and visitor signs to find your way around.' WHERE poi_id = 28 AND lang = N'en';
UPDATE dbo.POI_LOCALIZATION SET translated_description = N'Use the building directory to find a classroom or university office.' WHERE poi_id = 29 AND lang = N'en';
GO
