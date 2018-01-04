var MAX_ATTEMPTS = 50;

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
    eventHour   = parseInt(eventTimeComponents[0], 10),
    eventMinute = eventTimeComponents[1],
    eventAm     = eventHour < 12;

if (eventHour > 12) {
    eventHour -= 12;
}

eventHour = (eventHour < 10 ? "0" : "") + eventHour;

page.viewportSize = { width: 1000, height: 1000 };

var url = "https://www.facebook.com/groups/" + groupId + "/events/";

page.open(url, function (status) {
    if (status === "success") {
        awaitLogin(1);
    } else {
        fail("Failed to fetch login page (" + status + "); aborting.");
    }
});

function awaitLogin(attempts) {
    setTimeout(function () {
        console.log("Waiting for login...");
        if (page.evaluate(login)) {
            console.log("Logged in!");
            awaitEventPage(1);
        } else if (attempts === MAX_ATTEMPTS) {
            fail("Failed to recognize login.")
        } else {
            awaitLogin(attempts + 1);
        }
    }, 1000);
}

function awaitEventPage(attempts) {
    setTimeout(function () {
        console.log("Waiting for event page...");
        if (page.evaluate(createNewEvent)) {
            console.log("Got it!");
            awaitEventDialog(1);
        } else if (attempts === MAX_ATTEMPTS) {
            fail("Failed to recognize event page.")
        } else {
            awaitEventPage(attempts + 1);
        }
    }, 1000);
}

function awaitEventDialog(attempts) {
    setTimeout(function () {
        console.log("Waiting for event dialog...")
        if (page.evaluate(findEventDialog)) {
            console.log("Got event dialog! Filling out the form.");
            sendKeys(
                eventName,
                key.Tab,
                eventLocation,
                function () { setTimeout(awaitLocationDropdown, 2000) }
            );
        } else if (attempts === MAX_ATTEMPTS) {
            fail("Failed to recognize event dialog.");
        } else {
            console.log("Don't got event dialog.");
            awaitEventDialog(attempts + 1);
        }
    }, 30000);
}

function awaitLocationDropdown() {
    setTimeout(function () {
        console.log("Waiting for event dropdown to catch up...");
        sendKeys(key.Down, function () { setTimeout(awaitRestOfForm, 2000) });
    }, 2000);
}

function awaitRestOfForm() {
    sendKeys(
        key.Return,
        key.Tab,
        key.Tab,
        key.Backspace,
        eventDate,
        key.Tab,
        eventHour,
        key.Tab,
        eventMinute,
        key.Tab,
        eventAm ? "A" : "P",
        function () {
            console.log("Filled out all fields, submitting and rendering...");
            if (!page.evaluate(submitEvent)) {
                fail("Failed to click the submit-event button for some reason!");
            }
            render();
        }
    );
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
    var anchor = document.querySelector("a[ajaxify*='/events/dialog/create']");
    if (anchor) {
        anchor.click();
        return true;
    } else {
        return false;
    }
}

function submitEvent() {
    var button = document.querySelector("button[data-phantomjs='submit']");
    if (button) {
        button.click();
        return true;
    } else {
        return false;
    }
}

function findEventDialog() {
    var input = document.querySelector("input[placeholder='Add a short, clear name']");
    var button = document.querySelector("button[data-testid='event-create-dialog-confirm-button']");
    if (input && button) {
        input.focus();
        button.setAttribute("data-phantomjs", "submit");
        return true;
    } else {
        return false;
    }
}

function fail(message) {
    console.error(message);
    phantom.exit(1);
}

function render() {
    setTimeout(function () {
        page.render("out.png");
        phantom.exit();
    }, 3000);
}

function sendKeys(arg /* , ... */) {
    var rest = Array.prototype.slice.call(arguments, 1);
    var next = function (args) {
        if (args.length > 0) {
            setTimeout(
                function () { sendKeys.apply(null, args) },
                250 + Math.floor(Math.random() * 250)
            );
        }
    };
    switch (typeof arg) {
    case "function":
        arg();
        return;
    case "string":
        page.sendEvent("keypress", arg[0]);
        if (arg.length > 1) {
            next([ arg.substring(1) ].concat(rest));
        } else {
            next(rest);
        }
        break;
    case "number":
        page.sendEvent("keypress", arg);
        next(rest);
        break;
    }
}
