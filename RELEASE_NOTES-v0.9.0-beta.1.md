# Airban Converter v0.9.0-beta.1

This beta adds project persistence for **The Land Surveyors Workstation**.

## Added

- Project/job name and project notes fields.
- Portable Airban project file export as `.airban-project.json`.
- Airban project file import to restore project details, observations, parcel coordinates, selected output view, and notes.
- Same-device browser draft save, restore, and clear actions using local browser storage.
- Project filename cleanup based on project name, locality, and regional number.
- Project name now appears in the branded survey report.

## Notes For Testers

- Project files are plain JSON so they can be backed up, emailed, or archived with a survey job folder.
- Browser drafts are stored only on the current device/browser and should not replace exported project files.
- Reopened projects recompute parcel outputs when saved parcel coordinates are present.
