from config import database
from bokeh.plotting import figure as bokeh_figure
from bokeh.models import ColumnDataSource
import pandas as pd
from bokeh.palettes import Category10
import decimal
from bokeh.models import NumeralTickFormatter
from bokeh.themes import Theme

# Define a shared color palette for source categories
SOURCE_COLORS = {
    "Fossil Fuels": Category10[10][1],
    "Hydro": Category10[10][3],
    "Wind": Category10[10][2],
    "Solar": Category10[10][0],
    "Other": Category10[10][4],
}

theme = Theme(
    json={
        "attrs": {
            "Axis": {
                "axis_line_color": "#ccc",
                "major_tick_line_color": "#ccc",
                "minor_tick_line_color": "#ccc",
                "axis_label_text_color": "#666",
                "major_label_text_color": "#666",
                "axis_label_text_font_style": "normal",
            },
        }
    }
)

# Apply the custom theme globally


def result_to_df(result):
    # Convert rows to dictionaries and handle decimal.Decimal conversion
    return pd.DataFrame.from_records(
        [
            dict(
                (k, float(v) if isinstance(v, decimal.Decimal) else v)
                for k, v in dict(row).items()  # Explicitly convert row to a dictionary
            )
            for row in result
        ]
    )


def figure(**kwargs):
    kwargs = {
        "width": 600,
        "height": 400,
        "sizing_mode": "stretch_width",
        "tools": "box_zoom,reset",
        **kwargs,
    }
    fig = bokeh_figure(**kwargs)
    fig.toolbar.active_drag = None
    fig.toolbar.active_scroll = None
    fig.toolbar.active_tap = None
    fig.outline_line_width = 0
    fig.xgrid.grid_line_color = None
    fig.ygrid.grid_line_alpha = 0.5
    return fig


async def line_length():
    data = await database.fetch_all(
        """SELECT time AS date,
                (SELECT SUM(length) FROM stats.power_line WHERE time = a.time) AS total_length,
                (SELECT SUM(length) FROM stats.power_line WHERE time = a.time
                    AND voltage IS NOT NULL) AS with_voltage
                FROM stats.power_line a
                GROUP BY time
                ORDER BY time
        """
    )

    data = result_to_df(data)

    cds = ColumnDataSource(data)

    p = figure(
        x_axis_type="datetime",
        title="Total power line length",
    )
    p.yaxis.axis_label = "Length (m)"
    p.line("date", "total_length", source=cds, legend_label="Total length")
    p.scatter("date", "total_length", source=cds, size=2)
    p.line("date", "with_voltage", source=cds, color="red", legend_label="With voltage")
    p.scatter("date", "with_voltage", source=cds, color="red", size=2)
    p.legend.location = "bottom_right"
    return p


async def plant_count():
    data = await database.fetch_all(
        """SELECT time AS date,
                  CASE
                      WHEN source IN ('solar') THEN 'Solar'
                      WHEN source IN ('coal', 'gas', 'oil', 'diesel', 'nuclear') THEN 'Fossil Fuels'
                      WHEN source IN ('wind') THEN 'Wind'
                      WHEN source IN ('hydro', 'tidal', 'wave') THEN 'Hydro'
                      ELSE 'Other'
                  END AS type,
                  SUM(count) AS total_count
           FROM stats.power_plant
           GROUP BY time, type
           ORDER BY time"""
    )

    data = result_to_df(data)

    pivot_data = data.pivot(index="date", columns="type", values="total_count").fillna(
        0
    )

    # Reorder columns to match the order in SOURCE_COLORS
    pivot_data = pivot_data[[key for key in SOURCE_COLORS.keys() if key in pivot_data]]

    p = figure(
        x_axis_type="datetime",
        title="Power Plants by Type",
        y_range=(0, pivot_data.sum(axis=1).max() * 1.1),
        x_range=(
            pd.to_datetime("2014-01-01"),
            pivot_data.index.max() + pd.Timedelta(days=10),
        ),
    )
    p.yaxis.axis_label = "Count"
    p.yaxis.formatter = NumeralTickFormatter(format="0,0")

    cumulative_sum = pivot_data.cumsum(axis=1)
    previous_line = pd.Series(0, index=pivot_data.index)

    for plant_type in pivot_data.columns:
        color = SOURCE_COLORS.get(plant_type, "gray")
        p.line(
            pivot_data.index,
            cumulative_sum[plant_type],
            legend_label=plant_type,
            color=color,
        )
        p.scatter(
            pivot_data.index,
            cumulative_sum[plant_type],
            size=2,
            color=color,
        )
        p.varea(
            x=pivot_data.index,
            y1=previous_line,
            y2=cumulative_sum[plant_type],
            fill_color=color,
            fill_alpha=0.3,
        )
        previous_line = cumulative_sum[plant_type]

    p.legend.location = "top_left"
    return p


async def plant_output():
    data = await database.fetch_all(
        """SELECT time AS date,
                  CASE
                      WHEN source IN ('solar') THEN 'Solar'
                      WHEN source IN ('coal', 'gas', 'oil', 'diesel', 'nuclear') THEN 'Fossil Fuels'
                      WHEN source IN ('wind') THEN 'Wind'
                      WHEN source IN ('hydro', 'tidal', 'wave') THEN 'Hydro'
                      ELSE 'Other'
                  END AS type,
                  SUM(output) / 1e9 AS total_output  -- Convert watts to gigawatts
           FROM stats.power_plant
           GROUP BY time, type
           ORDER BY time"""
    )

    data = result_to_df(data)

    pivot_data = data.pivot(index="date", columns="type", values="total_output").fillna(
        0
    )

    # Reorder columns to match the order in SOURCE_COLORS
    pivot_data = pivot_data[[key for key in SOURCE_COLORS.keys() if key in pivot_data]]

    p = figure(
        x_axis_type="datetime",
        title="Power Plants by Output",
        y_range=(0, pivot_data.sum(axis=1).max() * 1.1),
        x_range=(
            pd.to_datetime("2021-01-11"),
            pivot_data.index.max() + pd.Timedelta(days=10),
        ),
    )
    p.yaxis.axis_label = "Output (GW)"
    p.yaxis.formatter = NumeralTickFormatter(format="0,0")

    cumulative_sum = pivot_data.cumsum(axis=1)
    previous_line = pd.Series(0, index=pivot_data.index)

    for plant_type in pivot_data.columns:
        color = SOURCE_COLORS.get(plant_type, "gray")
        p.line(
            pivot_data.index,
            cumulative_sum[plant_type],
            legend_label=plant_type,
            color=color,
        )
        p.scatter(
            pivot_data.index,
            cumulative_sum[plant_type],
            size=2,
            color=color,
        )
        p.varea(
            x=pivot_data.index,
            y1=previous_line,
            y2=cumulative_sum[plant_type],
            fill_color=color,
            fill_alpha=0.3,
        )
        previous_line = cumulative_sum[plant_type]

    p.legend.location = "bottom_right"
    return p
