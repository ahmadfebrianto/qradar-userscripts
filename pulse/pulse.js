// ==UserScript==
// @name        QRadar Userscripts
// @namespace   QRD
// @match       <URL>
// @grant       GM.xmlHttpRequest
// @version     1.0
// @author      Ahmad Febrianto
// @description A script to tweak some QRadar Pulse App behaviors for easier monitoring.
// ==/UserScript==

let dateTimeConverted = false;
let mostRecentOffenseDt = null;
let offenseWatcherActivated = false
const newOffenseBackgroundColor = "#548954";


/*
 * Get the iframe element hosting the offense table to watch.
 * Normally, iframe cannot be queried using the conventional method.
 */
function getIframeElement() {
    const iframe = document.getElementById("PAGE_QNODEJS_1052");
    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
    return innerDoc
}

/*
 * Notify when a new offense is detected.
 * It sends POST request to localhost running a web server.
 */
async function notifyOnOffense(payload) {
    GM.xmlHttpRequest({
        method: "POST",
        url: "http://127.0.0.1:5000/notify",
        data: JSON.stringify(payload),
        headers: {
            "Content-Type": "application/json"
        },
        onload: function (response) {
            console.log(response.responseText);
        }
    });
}

/*
 * Check the offense timestamp if it's within the last hour
 */
function isWithinLastHour(epochTimestamp) {
    const currentTime = Date.now();
    const oneHourAgo = currentTime - 3600 * 1000;
    return epochTimestamp >= oneHourAgo;
}


/*
 * You know what it does.
 */
function changeBackgroundColor(el, color) {
    el.style.backgroundColor = color;
}


/*
 * Convert offense timestamp to local datetime, in this case UTC+7.
 */
function convertDatetime(td) {
    let dateTime = new Date(parseInt(td.title));
    const options = {
        timeZone: "Asia/Jakarta",
        // weekday: 'short', // Display the full day of the week
        day: "numeric", // Display the day of the month
        month: "short", // Display the abbreviated month name
        year: "numeric", // Display the full year
        hour: "2-digit", // Display the hour in 2-digit format
        minute: "2-digit", // Display the minute in 2-digit format
        second: "2-digit", // Display the second in 2-digit format
        timeZoneName: "short", // Display the timezone abbreviation
        hour12: false, // Use 24-hour format
    };

    const formattedDate = dateTime.toLocaleString("en-US", options);
    td.textContent = formattedDate;
}

/*
 * This function creates a small button on the upper right and click it every 30s.
 * This is a workaround to keep QRadar user session logged in without any activity.
 * FYI, QRadar will expire the session when a user is not active on the QRadar page for more than 30 minutes.
 */
function createAutoClick() {
    const button = document.createElement("button");
    button.textContent = "X";
    const parent = document.getElementById("configHelp");
    parent.append(button);

    const interval = setInterval((_) => {
        button.click();
    }, 30 * 1000);
}


/*
 * This function creates a watcher on the offense table to watch for recent offenses every 5s.
 * It compares the topmost offense timestamp with the mostRecentOffenseDt variable value.
 * If it doesn't match, it means there must be a new offense.
 */
function createOffenseWatcher() {
    console.log("===Offense Watcher Started===");
    setInterval(_ => {
        const iframe = getIframeElement()
        const offenseRows = iframe.querySelectorAll("#view-1594 table tbody tr");
        if (offenseRows.length !== 0) {
            const firstOffenseRow = offenseRows[0];
            const firstOffenseDt = parseInt(firstOffenseRow.querySelector("td:nth-child(2)").title);

            // If the topmost offense timestamp is not the same as the mostRecentOffenseDt value,
            // there must be a new offense. Process the new offense and the assign its timestamp
            // to mostRecentOffenseDt variable.
            if (firstOffenseDt !== mostRecentOffenseDt) {
                mostRecentOffenseDt = firstOffenseDt;
                offenseRows.forEach(row => {
                    const tdStart = row.querySelector("td:nth-child(2)");
                    convertDatetime(tdStart);
                    const offenseDatetimeStart = parseInt(tdStart.title);
                    if (isWithinLastHour(offenseDatetimeStart)) {
                        changeBackgroundColor(row, newOffenseBackgroundColor);
                        const message = {
                            offenseDescription: row.querySelector("td:nth-child(1)").title,
                            offenseDatetime: tdStart.textContent,
                            offenseTimestamp: offenseDatetimeStart
                        };
                        notifyOnOffense(message);
                    }

                    const tdLast = row.querySelector("td:nth-child(3)");
                    convertDatetime(tdLast);
                });
            } else {
                offenseRows.forEach(row => {
                    const tdStart = row.querySelector("td:nth-child(2)");
                    if (tdStart.title == tdStart.textContent) {
                        convertDatetime(tdStart);
                        const tdLast = row.querySelector("td:nth-child(3)");
                        convertDatetime(tdLast);
                    }
                });
            }
        }
    }, 5 * 1000);
}

/*
 * This function creates an observer that watches the document title changes.
 * Document title normally changes when a user navigates between the QRadar menus/pages.
 * When the Pulse menu is selected, run some tasks:
 *  - Convert the offense timestamp to local time.
 *  - Colorize recent offense (within last hour)
 *  - Assign the topmost offense as the most recent one.
 */
function createTitleObserver() {
    function handler(mutations) {
        if (document.title === "QRadar - Dashboards (Pulse)") {
            // Create a periodic checking to check the offense table every 1s until it is rendered
            const checkInterval = setInterval(_ => {
                const iframe = getIframeElement()
                const offenseRows = iframe.querySelectorAll("#view-1594 table tbody tr");

                // If offenseRows length is not zero, offenses are finally rendered and then stop the periodic checking.
                if (offenseRows.length !== 0) {
                    clearInterval(checkInterval);
                    offenseRows.forEach(row => {
                        const tdStart = row.querySelector("td:nth-child(2)");
                        convertDatetime(tdStart);

                        const offenseDatetimeStart = parseInt(tdStart.title);
                        // If offense timestamp is within the last hour, colorize the background to distinct it from the old ones.
                        if (isWithinLastHour(offenseDatetimeStart)) {
                            changeBackgroundColor(row, newOffenseBackgroundColor);
                        }

                        // If mostRecentOffenseDt is null, assign the topmost offense as the most recent one by storing its timestamp.
                        if (mostRecentOffenseDt == null) {
                            mostRecentOffenseDt = offenseDatetimeStart
                        }

                        const tdLast = row.querySelector("td:nth-child(3)");
                        convertDatetime(tdLast);
                    });

                    dateTimeConverted = true;

                    // Activate offense watcher if not activated yet
                    if (!offenseWatcherActivated) {
                        createOffenseWatcher();
                        offenseWatcherActivated = true
                    }
                }
            }, 1000);
        }
    }

    const observer = new MutationObserver(handler);
    const target = document.querySelector("title");
    const config = { subtree: true, characterData: true, childList: true };
    observer.observe(target, config);
}

// Main function
(function () {
    "use strict";

    createAutoClick();
    createTitleObserver();
})();
