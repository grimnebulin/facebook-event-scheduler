var args = require("system").args,
    page = require("webpage").create(),
    key  = page.event.key;

if (args.length !== 8) {
    fail("usage: phantomjs schedule-event.js <email> <password> <group-id> <event-name> <event-location> <event-date> <event-time>");
}

var email         = args[1],
    password      = args[2],
    groupId       = args[3],
    eventName     = args[4],
    eventLocation = args[5],
    eventDate     = args[6],
    eventTime     = args[7];

if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(eventDate)) {
    fail("Invalid date: " + eventDate);
}

if (!/^\d{1,2}:\d{2}$/.test(eventTime)) {
    fail("Invalid time: " + eventTime);
}

var eventTimeComponents = eventTime.split(":"),
    eventHour   = eventTimeComponents[0],
    eventMinute = eventTimeComponents[1];

if (eventHour.length < 2) {
    eventHour = "0" + eventHour;
}

page.viewportSize = { width: 1000, height: 1000 };

var url = "https://www.facebook.com/groups/" + groupId + "/events/";

page.open(url, function (status) {
    if (status === "success") {
        awaitLogin();
    } else {
        fail("Failed to fetch login page; aborting.");
    }
});

function awaitLogin() {
    setTimeout(function () {
        console.log("Waiting for login...");
        if (page.evaluate(login)) {
            console.log("Logged in!");
            awaitEventPage();
        } else {
            awaitLogin();
        }
    }, 1000);
}

function awaitEventPage() {
    setTimeout(function () {
        console.log("Waiting for event page...");
        if (page.evaluate(createNewEvent)) {
            console.log("Got it!");
            awaitEventDialog();
        } else {
            awaitEventPage();
        }
    }, 1000);
}

function awaitEventDialog() {
    setTimeout(function () {
        console.log("Waiting for event dialog...")
        if (page.evaluate(findEventDialog)) {
            console.log("Got event dialog! Filling out the form.");
            sendKeys(
                eventName,
                key.Tab,
                eventLocation,
                key.Tab,
                key.Backspace,
                eventDate,
                key.Tab,
                eventHour,
                key.Tab,
                eventMinute
            );
            console.log("Filled out all fields, submitting and rendering...");
            page.evaluate(submitEvent);
            render();
        } else {
            console.log("Don't got event dialog.");
            awaitEventDialog();
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

function clickCreateEventButton(anchor) {
    if (/\/events\/dialog\/create/.test(anchor.getAttribute("ajaxify"))) {
        anchor.click();
        return true;
    } else {
        return false;
    }
}

function createNewEvent() {
    var anchors = Array.prototype.filter.call(
        document.getElementsByTagName("A"),
        function (anchor) {
            return /\/events\/dialog\/create/.test(anchor.getAttribute("ajaxify"));
        }
    );
    if (anchors.length > 0) {
        anchors[0].click();
        return true;
    } else {
        return false;
    }
}

function focusInput(data) {
    var inputs = Array.prototype.filter.call(
        document.getElementsByTagName("INPUT"),
        function (input) {
            return input.getAttribute("data-phantomjs") === data;
        }
    );
    if (inputs.length > 0) {
        inputs[0].focus();
        return true;
    } else {
        return false;
    }
}

function submitEvent() {
    var buttons = Array.prototype.filter.call(
        document.getElementsByTagName("BUTTON"),
        function (button) {
            return button.getAttribute("data-phantomjs") === "submit";
        }
    );
    if (buttons.length > 0) {
        buttons[0].click();
        return true;
    } else {
        return false;
    }
}

function findEventDialog() {
    var inputs = Array.prototype.filter.call(
        document.getElementsByTagName("INPUT"),
        function (input) {
            return input.getAttribute("placeholder") === "Add a short, clear name";
        }
    );
    var buttons = Array.prototype.filter.call(
        document.getElementsByTagName("BUTTON"),
        function (button) {
            return button.getAttribute("data-testid") === "event-create-dialog-confirm-button";
        }
    );
    if (inputs.length > 0 && buttons.length > 0) {
        inputs[0].focus();
        buttons[0].setAttribute("data-phantomjs", "submit");
        return true;
    } else {
        return false;
    }
}

function fail(message) {
    console.error(message);
    phantom.exit();
}

function render() {
    setTimeout(function () {
        page.render("out.png");
        phantom.exit();
    }, 3000);
}

function sendKeys() {
    Array.prototype.concat.apply(
        [],
        Array.prototype.map.call(arguments, function (x) {
            return typeof x === "string" ? x.split("") : [ x ];
        })
    ).forEach(function (key) {
        page.sendEvent("keypress", key);
    });
}
