# Airban Converter v0.14.0-beta.1

This beta adds the first angular traverse reduction workflow for **The Land Surveyors Workstation**.

## Added

- Angular Traverse Reduction panel in Parcel Workstation.
- Initial bearing input plus observed angle mode selection.
- Support for deflection-right, deflection-left, interior-right, and interior-left angle interpretation.
- Angular observation CSV/paste input using `to,angle,distance,code`.
- Derived whole-circle bearings, coordinates, map preview, close error, and precision.
- Same Bowditch adjustment, Traverse CSV export, parcel transfer, workbook, and report flow as bearing/distance reduction.
- Project save/restore support for angular traverse inputs and adjustment state.
- Sample file at `samples/angular-traverse-observations.csv`.

## Notes For Testers

- For the sample, use initial bearing `321 deg 10' 25"` and Deflection right mode.
- The first angular row may leave angle blank; the initial bearing is used for the first traverse leg.
- This is a practical traverse reducer, not yet a full Topcon raw angle-set or least-squares adjustment engine.
