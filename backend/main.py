from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field
from pyproj import Transformer


GridUnit = Literal["gold_coast_foot", "metre", "international_foot"]

GOLD_COAST_FOOT_TO_METRE = 0.304799710181509
INTERNATIONAL_FOOT_TO_METRE = 0.3048

grid_to_wgs84 = Transformer.from_crs("EPSG:2136", "EPSG:4326", always_xy=True)
wgs84_to_grid = Transformer.from_crs("EPSG:4326", "EPSG:2136", always_xy=True)

app = FastAPI(title="Ghana Coordinate Platform API")


class GridPoint(BaseModel):
    easting: float
    northing: float
    unit: GridUnit = "gold_coast_foot"


class WgsPoint(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    unit: GridUnit = "gold_coast_foot"


def unit_to_native(value: float, unit: GridUnit) -> float:
    if unit == "gold_coast_foot":
        return value
    if unit == "metre":
        return value / GOLD_COAST_FOOT_TO_METRE
    if unit == "international_foot":
        return (value * INTERNATIONAL_FOOT_TO_METRE) / GOLD_COAST_FOOT_TO_METRE
    return value


def native_to_unit(value: float, unit: GridUnit) -> float:
    if unit == "gold_coast_foot":
        return value
    if unit == "metre":
        return value * GOLD_COAST_FOOT_TO_METRE
    if unit == "international_foot":
        return (value * GOLD_COAST_FOOT_TO_METRE) / INTERNATIONAL_FOOT_TO_METRE
    return value


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/convert/grid-to-wgs84")
def convert_grid_to_wgs84(point: GridPoint) -> dict[str, float | str]:
    native_easting = unit_to_native(point.easting, point.unit)
    native_northing = unit_to_native(point.northing, point.unit)
    longitude, latitude = grid_to_wgs84.transform(native_easting, native_northing)
    return {
        "latitude": latitude,
        "longitude": longitude,
        "unit": point.unit,
    }


@app.post("/convert/wgs84-to-grid")
def convert_wgs84_to_grid(point: WgsPoint) -> dict[str, float | str]:
    easting_native, northing_native = wgs84_to_grid.transform(point.longitude, point.latitude)
    return {
        "easting": native_to_unit(easting_native, point.unit),
        "northing": native_to_unit(northing_native, point.unit),
        "unit": point.unit,
    }
