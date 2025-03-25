from config import database
from bokeh.models import (
    ColumnDataSource,
    NumeralTickFormatter,
    Range1d,
    LinearAxis,
    HoverTool,
)
from charts.util import result_to_df, figure


async def grid_summary(country_name: str):
    """Generate a Bokeh plot of the length of power lines and the number of substations in a country."""

    data = await database.fetch_all(
        """
        select date_trunc('month', coalesce(pl.time, ss.time)) AS date,
                avg(pl.line_length) AS line_length,
                avg(ss.substation_count) AS substation_count
                FROM
                    (select time, sum(length) as line_length from stats.power_line
                        WHERE country = :country_name
                        group by time) pl
                full outer join (select time, sum(count) as substation_count FROM stats.substation
                        WHERE country = :country_name
                        group by time) ss
                    ON ss.time = pl.time
                group by date_trunc('month', coalesce(pl.time, ss.time))
                order by date_trunc('month', coalesce(pl.time, ss.time))
        """,
        {"country_name": country_name},
    )

    df = result_to_df(data)
    df["line_length"] /= 1000  # Convert to km
    cds = ColumnDataSource(df)

    p = figure(
        x_axis_type="datetime",
        title=f"{country_name}: grid summary",
        y_range=(0, df["line_length"].max() * 1.1),
    )
    p.yaxis.axis_label = "Power Line Length (km)"
    p.yaxis.formatter = NumeralTickFormatter(format="0,0")

    p.extra_y_ranges = {
        "substation_count": Range1d(start=0, end=df["substation_count"].max() * 1.4)
    }

    ax2 = LinearAxis(y_range_name="substation_count", axis_label="Substation Count")
    p.add_layout(ax2, "right")
    ax2.axis_label = "Substation count"
    ax2.formatter = NumeralTickFormatter(format="0,0")  # type: ignore

    p.line(
        "date",
        "line_length",
        source=cds,
        legend_label="Power line length",
        color="blue",
    )
    p.scatter("date", "line_length", source=cds, size=4, color="blue")
    p.line(
        "date",
        "substation_count",
        source=cds,
        legend_label="Substation count",
        color="green",
        y_range_name="substation_count",
    )
    p.scatter(
        "date",
        "substation_count",
        source=cds,
        size=4,
        color="green",
        y_range_name="substation_count",
    )

    hover = HoverTool(
        tooltips=[
            ("Month", "@date{%Y-%m}"),
            ("Line length", "@line_length{0,0} km"),
            ("Substation count", "@substation_count{0,0}"),
        ]
    )
    hover.formatters = {"@date": "datetime"}
    p.add_tools(hover)
    p.legend.location = "bottom_right"

    return p


async def plant_summary(country_name: str):
    """Two-axis plot showing the number of power plants and their total output."""

    data = await database.fetch_all(
        """
        SELECT date_trunc('month', time) AS date,
               avg(count) AS plant_count,
               avg(output) / 1e9 AS total_output  -- Convert watts to gigawatts
        FROM (
            SELECT time, SUM(count) AS count, SUM(count * output) AS output
            FROM stats.power_plant
            WHERE country = :country_name
            GROUP BY time
        ) subquery
        GROUP BY date_trunc('month', time)
        ORDER BY date_trunc('month', time)
        """,
        {"country_name": country_name},
    )

    df = result_to_df(data)
    cds = ColumnDataSource(df)

    p = figure(
        x_axis_type="datetime",
        title=f"{country_name}: power plant summary",
        y_range=(0, df["plant_count"].max() * 1.1),
    )
    p.yaxis.axis_label = "Plant Count"
    p.yaxis.formatter = NumeralTickFormatter(format="0,0")

    p.extra_y_ranges = {
        "total_output": Range1d(start=0, end=df["total_output"].max() * 1.2)
    }

    ax2 = LinearAxis(y_range_name="total_output", axis_label="Total Output (GW)")
    p.add_layout(ax2, "right")
    ax2.formatter = NumeralTickFormatter(format="0,0")  # type: ignore

    p.line(
        "date",
        "plant_count",
        source=cds,
        legend_label="Count",
        color="blue",
    )
    p.scatter("date", "plant_count", source=cds, size=4, color="blue")
    p.line(
        "date",
        "total_output",
        source=cds,
        legend_label="Output",
        color="green",
        y_range_name="total_output",
    )
    p.scatter(
        "date",
        "total_output",
        source=cds,
        size=4,
        color="green",
        y_range_name="total_output",
    )

    hover = HoverTool(
        tooltips=[
            ("Month", "@date{%Y-%m}"),
            ("Total output", "@total_output{0,0.0} GW"),
            ("Plant count", "@plant_count{0,0}"),
        ]
    )
    hover.formatters = {"@date": "datetime"}
    p.add_tools(hover)

    p.legend.location = "bottom_right"

    return p
