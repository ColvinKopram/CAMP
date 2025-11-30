import { useState } from "react"

const categories = [
    { label: "ASSAULT", value: "ASSAULT" },
    { label: "BURGLARY", value: "BURGLARY" },
    { label: "DRUGS", value: "DRUGS" },
    { label: "HARASSMENT", value: "HARASSMENT" },
    { label: "ROBBERY", value: "ROBBERY" },
    { label: "SHOOTINGS", value: "SHOOTINGS" },
    { label: "THEFT", value: "THEFT" },
    { label: "VANDALISM", value: "VANDALISM" },
    { label: "VEHICLE THEFT", value: "VEHICLE THEFT" },
]
    
export default function Maps() {
    const [selected, setSelected] = useState(categories[0].value)

    return (
        <div className="w-screen h-screen flex flex-col">
            <h1 className="text-4xl text-center mt-4">NYC Crime Map</h1>

            <select
                className="mt-4 mx-auto p-2 border rounded"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
            >
                {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                ))}
            </select>

                <iframe
                    src={`https://camp-service-353447914077.us-east4.run.app/maps/heatmap?category=${selected}`}
                    style={{ width: "100%", height: "1000px", border: "none" }}
                    title="NYC Crime Map"
                />

        </div>
    )
}