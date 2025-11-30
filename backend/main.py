# backend/app.py
from flask import Flask , request
import geopandas as gpd
import folium
import pandas as pd
from folium.plugins import MarkerCluster
from folium import Map, Choropleth, GeoJson
from folium.features import GeoJsonTooltip, Element
from shapely.geometry import Point
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # allows React to fetch from different port

file_location = os.path.join(os.path.dirname(__file__), "sample_df_50k.csv")
df = pd.read_csv(file_location)
shapes_gdf = gpd.read_file("nyc_nta_2020.geojson")

# Convert df to GeoDataFrame
df_gdf = gpd.GeoDataFrame(
    df,
    geometry=gpd.points_from_xy(df["Longitude"], df["Latitude"]),
    crs="EPSG:4326"
)

# Spatial join once
df_with_shapes = gpd.sjoin(df_gdf, shapes_gdf, how="inner", predicate="intersects")

category_rules = {
    "VANDALISM": {
        "include": ["CRIM MISCHIEF", "TRESPASS", "GRAFF"],
        "exclude": ["ASSAULT", "HARASSMENT"]
    },
    "DRUGS": {
        "include": ["NARCO", "MARIJUANA"],
        "exclude": []
    },
    "HARASSMENT": {
        "include": ["HARASSMENT", "VIOL ORDER PROTECT", "DOMESTIC", "FAMILY"],
        "exclude": ["ASSAULT"]
    },
    "ASSAULT": {
        "include": ["ASSAULT"],
        "exclude": []
    },
    "VEHICLE THEFT": {
        "include": ["LARCENY", "VEHICLE"],
        "exclude": []
    },
    "THEFT": {
        "include": ["LARCENY"],
        "exclude": ["VEHICLE"]
    },
    "BURGLARY": {
        "include": ["BURGLARY"],
        "exclude": []
    },
    "ROBBERY": {
        "include": ["ROBBERY"],
        "exclude": []
    },
    "SHOOTINGS": {
        "include": ["SHOT SPOTTER", "SHOTS", "FIREARM"],
        "exclude": []
    }
}

precomputed_categories = {}

for cat, rules in category_rules.items():
    mask = df_with_shapes["TYP_DESC"].str.contains("|".join(rules["include"]), case=False, na=False)
    if rules["exclude"]:
        mask &= ~df_with_shapes["TYP_DESC"].str.contains("|".join(rules["exclude"]), case=False, na=False)
    precomputed_categories[cat] = df_with_shapes[mask]

choropleth_maps = {}

for cat, subset in precomputed_categories.items():
    counts = subset.groupby("NTA2020").size().reset_index(name="count")

    shapes_with_counts = shapes_gdf.merge(counts, on="NTA2020", how="left").fillna(0)

    m = folium.Map(location=[40.7128, -74.0060], zoom_start=11, tiles="CartoDB dark_matter")
    folium.Choropleth(
        geo_data=shapes_with_counts,
        data=shapes_with_counts,
        columns=["NTA2020", "count"],
        key_on="feature.properties.NTA2020",
        fill_color="YlOrRd",
        fill_opacity=0.8,
        line_opacity=0.3,
        nan_fill_color="gray",
        legend_name=f"{cat} Incidents"
    ).add_to(m)

    GeoJson(
        shapes_with_counts,
        style_function=lambda feature: {
            "fillColor": "transparent",
            "color": "transparent",
            "weight": 0
        },
        tooltip=GeoJsonTooltip(
            fields=["NTAName", "count"],
            aliases=["Neighborhood:", "Incidents:"],
            localize=True,
            sticky=True,
        )
    ).add_to(m)

    map_title = f"{cat} in NYC"
    subtitle = "Neighborhood incident counts"
    title_html = f"""
        <div style="
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            background-color: rgba(0, 0, 0, 0.6);
            padding: 6px 10px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            text-align: center;
        ">
            <b>{map_title}</b><br>{subtitle}
        </div>
    """
    m.get_root().html.add_child(Element(title_html))

    choropleth_maps[cat] = m.get_root().render()

@app.route("/")
def default_map():
    m = Map(location=(40.7128, -74.0060), zoom_start=10, tiles="CartoDB dark_matter")
    return m._repr_html_()

@app.route("/maps/heatmap")
def crime_heatmap():
    # Get query parameter ?category=ASSAULT
    category = request.args.get("category", "ASSAULT")

    if category not in choropleth_maps:
        return f"Invalid category: {category}", 400
    
    return choropleth_maps[category]

def make_crime_heatmap(
    df_subset,
    shapes_gdf,
    center=(40.7128, -74.0060),
    zoom_start=10,
    map_title="NYC Crime Heatmap",
    subtitle="Neighborhoods colored by number of incidents",
    legend_name="Number of incidents",
):
    sub = df_subset.dropna(subset=["Latitude", "Longitude"]).copy()
    gdf_points = gpd.GeoDataFrame(
        sub,
        geometry=[Point(xy) for xy in zip(sub["Longitude"], sub["Latitude"])],
        crs="EPSG:4326",
    )
    joined = gpd.sjoin(gdf_points, shapes_gdf, how="inner", predicate="within")
    neigh_counts = joined.groupby("NTAName").size().reset_index(name="incident_count")
    shapes_plot = shapes_gdf.merge(neigh_counts, on="NTAName", how="left")

    m = Map(location=center, zoom_start=zoom_start, tiles="CartoDB dark_matter")

    Choropleth(
        geo_data=shapes_plot,
        data=shapes_plot,
        columns=["NTAName", "incident_count"],
        key_on="feature.properties.NTAName",
        fill_color="YlOrRd",
        fill_opacity=0.8,
        line_opacity=0.3,
        nan_fill_color="gray",
        legend_name=legend_name,
    ).add_to(m)

    GeoJson(
        shapes_plot,
        style_function=lambda x: {"fillColor": "transparent", "color": "transparent", "weight": 0},
        tooltip=GeoJsonTooltip(
            fields=["NTAName", "incident_count"],
            aliases=["Neighborhood", "Incidents"],
            localize=True,
            sticky=True,
        ),
    ).add_to(m)

    title_html = f"""
    <div style="
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        background-color: rgba(0, 0, 0, 0.6);
        padding: 6px 10px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        text-align: center;
    ">
        <b>{map_title}</b><br>{subtitle}
    </div>
    """
    m.get_root().html.add_child(Element(title_html))
    return m

if __name__ == "__main__":
    app.run(debug=True)
