# Tweaks for Pulse app

## The problems

The Pulse app can be used to monitor offenses in real-time via the `Most recent offenses` widget without having to refresh the page manually.

The problem with this method is the widget presents datetime data in UTC format and no way to convert it to local datetime. Apart from the widget presentation, QRadar SIEM will log users out upon 30 minutes of inactivity. I hate it.

## Available tweaks

-   Convert datetime to local datetime.
-   Colorize new offenses background to make them noticable.
-   Create a small button on the upper-right and auto-click it every 30 seconds.
-   `(Optional)` Send new offenses data (description and datetime) to the webhook running on the localhost. Upon receiving new offenses, webhook will trigger two actions: `play sound` and `send notification via Telegram`

## Prerequisites

-   Make sure the `Most recent offenses` widget are shown.
-   Configure the widget as follows:

    **Query**

    -   `Data source`: Offense
    -   `Refresh Time`: Every Minute
    -   `Fields`: id, description, magnitude, start_time, last_updated_time, status
    -   `Filter`: status = "OPEN"
    -   `Sort`: -start_time

    **Views**

    -   `Chart Type`: Tabular Display
    -   On the `General` tab and `Display` section, select `Selected Column(s)` option and add only four columns with the following order:
        -   description
        -   start_time
        -   last_updated_time
        -   status
