# Airban Converter v0.41.1-beta.1

## What Changed

- Added a Word-compatible History of Survey export from the History section.
- Reordered the main workspace so Coordinate Tools, Results/Output, Batch CSV, and Map Preview form the upper converter workspace.
- Moved the Parcel Workstation into the lower full-width workspace while keeping its current functionality.
- Fixed the Map Preview so it no longer stays pinned over the Parcel Workstation while scrolling.
- Updated beta documentation, deployment notes, and validation scripts for the new History export and layout.

## Test Focus

1. Preview a History of Survey draft, then export it with the Word button.
2. Open the downloaded `.doc` file in Microsoft Word and confirm the title and paragraphs match the app preview.
3. Confirm desktop layout shows converter tools and map first, with the Parcel Workstation below and no overlap while scrolling.
4. Confirm mobile layout stacks Coordinate Tools, Results, Batch CSV, Map Preview, then Parcel Workstation.

## Notes

- The History export is a Word-compatible `.doc` file generated from HTML, so it opens in Microsoft Word without needing a server.
- This remains an internal beta and should still be checked against known control and office standards before production use.
