# backend/app.py
from flask import Flask
import folium
import pandas as pd
from folium.plugins import MarkerCluster
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # allows React to fetch from different port

file_location = os.path.join(os.path.dirname(__file__), "sample_df_50k.csv")
print("CSV exists?", os.path.exists(file_location))
df = pd.read_csv(file_location)

@app.route("/")
def map_view():
    

    # Initialize map
    CENTER = (40.7128, -74.0060)
    START_ZOOM = 10
    m = folium.Map(location=CENTER, zoom_start=START_ZOOM, tiles="CartoDB dark_matter")
    cluster = MarkerCluster().add_to(m)

    # Add markers
    for _, r in df[:1000].iterrows():
        popup_html = f"""
        <b>{r["MAIN_TYPE"]}</b><br>
        {r["TYP_DESC"]}<br>
        Severity: {r["SEVERITY"]}<br>
        Borough: {r["BORO_NM"]}<br>
        Date: {r["INCIDENT_DATE"]}<br>
        Time: {r["INCIDENT_TIME"]}
        """
        color = (
            "#00CC96"
            if r["SEVERITY"] == "LOW"
            else "#FECB52"
            if r["SEVERITY"] == "MEDIUM"
            else "#EF553B"
        )
        folium.CircleMarker(
            location=(r["Latitude"], r["Longitude"]),
            radius=2.5,
            color=color,
            fill=True,
            fill_opacity=0.9,
            weight=0,
        ).add_child(folium.Popup(popup_html, max_width=260)).add_to(cluster)

    # Return HTML as string
    return m._repr_html_()

