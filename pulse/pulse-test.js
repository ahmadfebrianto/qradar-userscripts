// Paste the below function in the browser console on the Pulse page. 
// Then invoke the function 

function testNewAlert() {
    const iframe = document.getElementById("PAGE_QNODEJS_1052");
    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
    var td2 = innerDoc
        .querySelector(
            "table.sy--dark-ui > tbody:nth-child(2) > tr:nth-child(1)"
        )
        .cloneNode(true);
    var timestamp = Date.now();
    td2.querySelector("td:nth-child(2)").title = `${timestamp}`;
    var tr = innerDoc.querySelector("table.sy--dark-ui > tbody:nth-child(2)");
    tr.prepend(td2);
}
