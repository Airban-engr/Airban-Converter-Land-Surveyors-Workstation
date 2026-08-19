# Airban Converter v0.12.0-beta.1

This beta adds Bowditch / Compass Rule traverse adjustment to the emerging **Land Surveyors Workstation** workflow.

## Added

- Adjust Traverse action for closed bearing/distance traverses.
- Adjusted close summary alongside raw close error and precision.
- Reduction table columns for adjusted easting, adjusted northing, and cumulative corrections.
- Separate Use Raw and Use Adjusted actions for transferring reduced beacons into parcel computation.
- Adjusted traverse points on the map preview after adjustment.
- Verification coverage for Bowditch adjustment and adjusted parcel computation.

## Notes For Testers

- Bowditch adjustment requires a closed traverse: the final point ID must match the starting point ID.
- The adjustment distributes easting and northing misclosure by line length.
- This is not yet a full raw angle-set or least-squares observation adjustment.
- Compare adjusted outputs against trusted computation sheets before professional use.
