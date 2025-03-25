from charts.util import result_to_df
from charts.util import figure
from config import database
from bokeh.models import ColumnDataSource
import pandas as pd
from bokeh.palettes import Category10
from bokeh.models import NumeralTickFormatter, HoverTool
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


async def line_length():
    data = await database.fetch_all(
        """SELECT date_trunc('week', time) AS date,
                avg((SELECT SUM(length) FROM stats.power_line WHERE time = a.time)) AS total_length,
                avg((SELECT SUM(length) FROM stats.power_line WHERE time = a.time
                    AND voltage IS NOT NULL)) AS with_voltage
                FROM stats.power_line a
                GROUP BY date_trunc('week', time)
                ORDER BY date_trunc('week', time)
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


def _plot_stacked_areas(p, data: pd.DataFrame, colors: dict[str, str], hover=None):
    """
    Helper function to plot stacked areas with lines and points using Bokeh's stack functions

    Args:
        p: Bokeh figure
        pivot_data: DataFrame with date index and columns for each category
        source_colors: Dictionary mapping categories to colors

    Returns:
        The updated Bokeh figure
    """
    source = ColumnDataSource(data)

    color_list = [colors.get(series, "gray") for series in data.columns]

    p.varea_stack(
        stackers=list(data.columns),
        x="date",
        color=color_list,
        alpha=0.3,
        legend_label=list(data.columns),
        source=source,
    )

    lines = p.vline_stack(
        stackers=list(data.columns),
        x="date",
        color=color_list,
        legend_label=list(data.columns),
        source=source,
    )

    if hover:
        hover.renderers = lines
        p.add_tools(hover)

    return p


async def plant_count():
    data = await database.fetch_all(
        """SELECT date_trunc('week', time) AS date, type, avg(total_count) AS total_count FROM (
                SELECT time,
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
           ) AS a
            GROUP BY date_trunc('week', time), type
            ORDER BY date_trunc('week', time)
           """
    )

    data = result_to_df(data)

    pivot_data = data.pivot(index="date", columns="type", values="total_count").fillna(
        0
    )

    # Reorder columns to match the order in SOURCE_COLORS
    pivot_data = pivot_data[[key for key in SOURCE_COLORS.keys() if key in pivot_data]]

    p = figure(
        x_axis_type="datetime",
        title="Power plant count by source",
        y_range=(0, pivot_data.sum(axis=1).max() * 1.1),
        x_range=(
            pd.to_datetime("2014-01-01"),
            pivot_data.index.max() + pd.Timedelta(days=10),
        ),
    )
    p.yaxis.axis_label = "Count"
    p.yaxis.formatter = NumeralTickFormatter(format="0,0")

    hover = HoverTool(
        tooltips=[
            ("Date", "@date{%F}"),
            ("Source", "$name"),
            ("Count", "@$name{0,0}"),
        ]
    )
    hover.formatters = {"@date": "datetime"}
    p = _plot_stacked_areas(p, pivot_data, SOURCE_COLORS, hover=hover)

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
                  SUM(count * output) / 1e9 AS total_output  -- Convert watts to gigawatts
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
        title="Power plant output by source",
        y_range=(0, pivot_data.sum(axis=1).max() * 1.1),
        x_range=(
            pd.to_datetime("2021-01-11"),
            pivot_data.index.max() + pd.Timedelta(days=10),
        ),
    )
    p.yaxis.axis_label = "Output (GW)"
    p.yaxis.formatter = NumeralTickFormatter(format="0,0")

    hover = HoverTool(
        tooltips=[
            ("Date", "@date{%F}"),
            ("Source", "$name"),
            ("Output", "@$name{0,0} GW"),
        ]
    )
    hover.formatters = {"@date": "datetime"}
    p = _plot_stacked_areas(p, pivot_data, SOURCE_COLORS, hover=hover)

    p.legend.location = "bottom_right"
    return p


async def substation_count():
    data = await database.fetch_all(
        """SELECT date_trunc('week', time) AS date,
                  avg((SELECT SUM(count) FROM stats.substation WHERE time = s.time)) AS total_count,
                  avg((SELECT SUM(count) FROM stats.substation WHERE time = s.time
                      AND voltage IS NOT NULL)) AS with_voltage
           FROM stats.substation s
           GROUP BY date_trunc('week', time)
           ORDER BY date_trunc('week', time)
        """
    )

    data = result_to_df(data)
    cds = ColumnDataSource(data)

    p = figure(
        x_axis_type="datetime",
        title="Substation count",
        y_range=(0, data["total_count"].max() * 1.1),
        x_range=(
            pd.to_datetime("2014-01-01"),
            data["date"].max() + pd.Timedelta(days=10),
        ),
    )
    p.yaxis.axis_label = "Count"
    p.yaxis.formatter = NumeralTickFormatter(format="0,0")
    p.varea("date", 0, "total_count", source=cds, alpha=0.3, legend_label="Total")
    p.scatter("date", "total_count", source=cds, size=2)
    p.line(
        "date",
        "with_voltage",
        source=cds,
        legend_label="With voltage",
        line_color="red",
    )
    p.scatter("date", "with_voltage", source=cds, size=2, color="red")
    p.legend.location = "bottom_right"
    return p
