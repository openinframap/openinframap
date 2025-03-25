from bokeh.plotting import figure as bokeh_figure
import pandas as pd


import decimal


def result_to_df(result) -> pd.DataFrame:
    return pd.DataFrame.from_records(
        [
            dict(
                (k, float(v) if isinstance(v, decimal.Decimal) else v)
                for k, v in dict(row).items()
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
