var page = require("webpage").create();

page.viewportSize = { width: 1000, height: 1000 };

// var URL= "https://www.facebook.com/groups/209660122380891/events/";
var URL = "https://www.facebook.com/groups/1446946041993618/events/";

function render() {
    setTimeout(function () {
        page.render("out.png");
        phantom.exit();
    }, 3000);
}

page.open(URL, function (status) {
    console.log(status);
    if (status === "success") {
        awaitLogin();
    } else {
        console.log("Failed to fetch page; aborting.");
        phantom.exit();
    }
});

function sendText(str) {
    for (var i = 0; i < str.length; ++i) {
        page.sendEvent("keypress", str[i]);
    }
}

function awaitEventDialog() {
    setTimeout(function () {
        console.log("Checking for event dialog...");
        var found = page.evaluate(findEventDialog);
        console.log("Found " + found + " elements.");
        if (found >= 6) {
            var sent = 0;
            console.log("Got event dialog! Filling out the form.");
            if (page.evaluate(focusInput, "name")) {
                console.log("Filling out the title...");
                sendText("Round Table Game Night");
                console.log("Filled out the title.");
                ++sent;
            } else {
                console.log("Failed to focus on event name!");
            }
            page.sendEvent("keypress", page.event.key.Tab);
            console.log("Filling out the place...");
            sendText("San Mateo Round Table");
            console.log("Filled out the place.");
            ++sent;
            page.sendEvent("keypress", page.event.key.Tab);
            page.sendEvent("keypress", page.event.key.Backspace);
            console.log("Filling out the date.");
            sendText("6/2/2017");
            console.log("Filled out the date.");
            ++sent;
            page.sendEvent("keypress", page.event.key.Tab);
            console.log("Filling out the hour.");
            sendText("06");
            console.log("Filled out the hour.");
            ++sent;
            page.sendEvent("keypress", page.event.key.Tab);
            console.log("Filling out the minutes.");
            sendText("30");
            console.log("Filled out the minutes.");
            ++sent;
            if (sent === 5) {
                console.log("Filled out all fields, submitting and rendering...");
                page.evaluate(submitEvent);
                render();
            } else {
                console.log("Didn't fill out all fields for some reason!");
                phantom.exit();
            }
        } else {
            console.log("Don't got event dialog.");
            awaitEventDialog();
        }
    }, 1000);
}

function awaitEventPage() {
    setTimeout(function () {
        console.log("Checking for event page...");
        if (page.evaluate(findEventPage)) {
            console.log("Got event page!");
            awaitEventDialog();
        } else {
            console.log("Don't got event dialog.");
            awaitEventPage();
        }
    }, 1000);
}

function awaitLogin() {
    setTimeout(function () {
        console.log("Checking for login...");
        if (page.evaluate(login)) {
            console.log("Got login!");
            awaitEventPage();
        } else {
            console.log("Don't got login.");
            awaitLogin();
        }
    }, 1000);
}

function login() {
    var email = document.getElementById("email");
    var pass  = document.getElementById("pass");
    var login = document.getElementById("loginbutton");
    if (email && pass && login) {
        email.setAttribute("value", "sean@seanmcafee.name");
        pass.setAttribute("value", "missing-feature");
        login.click();
        return true;
    } else {
        return false;
    }
}

function findEventPage() {
    var anchors = document.getElementsByTagName("A");
    for (var i = 0; i < anchors.length; ++i) {
        var anchor = anchors[i];
        if (/\/events\/dialog\/create/.test(anchor.getAttribute("ajaxify"))) {
            anchor.click();
            return true;
        }
    }
    return false;
}

function focusInput(data) {
    var inputs = document.getElementsByTagName("INPUT");
    for (var i = 0; i < inputs.length; ++i) {
        var input = inputs[i];
        if (input.getAttribute("data-phantomjs") === data) {
            input.focus();
            return true;
        }
    }
    return false;
}

function submitEvent() {
    var buttons = document.getElementsByTagName("BUTTON");
    for (var i = 0; i < buttons.length; ++i) {
        var button = buttons[i];
        if (button.getAttribute("data-phantomjs") === "submit") {
            console.log("Clicking the submit button!");
            button.click();
            return true;
        }
    }
    return false;
}

function findEventDialog() {
    // event name: input[placeholder="Add a short, clear name"]
    // location: input[placeholder="Include a place or address"]
    // Date: input[placeholder="mm/dd/yyyy"]
    // Hours: input with aria-describedby is the id of a span with aria-label="hours"
    // Time: Likewise but with aria-describedby = "minutes"
    var found = 0;
    var spans = document.getElementsByTagName("SPAN");
    var spanLabelById = { };
    for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        var id = span.getAttribute("id");
        var label = span.getAttribute("aria-label");
        if (id && label) {
            spanLabelById["K" + id] = label;
        }
    }
    var inputs = document.getElementsByTagName("INPUT");
    for (var i = 0; i < inputs.length; ++i) {
        var input = inputs[i];
        var placeholder = input.getAttribute("placeholder");
        var describedBy = input.getAttribute("aria-describedby");
        if (placeholder === "Add a short, clear name") {
            input.setAttribute("data-phantomjs", "name")
            ++found;
        } else if (placeholder === "Include a place or address") {
            input.setAttribute("data-phantomjs", "place");
            ++found;
        } else if (placeholder === "mm/dd/yyyy") {
            input.setAttribute("data-phantomjs", "date");
            ++found;
        } else if (describedBy) {
            if (spanLabelById["K" + describedBy] === "hours") {
                input.setAttribute("data-phantomjs", "hours");
                ++found;
            } else if (spanLabelById["K" + describedBy] === "minutes") {
                input.setAttribute("data-phantomjs", "minutes");
                ++found;
            }
        }
    }
    var buttons = document.getElementsByTagName("BUTTON");
    for (var i = 0; i < buttons.length; ++i) {
        var button = buttons[i];
        if (button.getAttribute("data-testid") === "event-create-dialog-confirm-button") {
            button.setAttribute("data-phantomjs", "submit");
            ++found;
            break;
        }
    }
    return found;
}
