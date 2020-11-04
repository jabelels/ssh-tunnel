

var os = require('os');
var prettyBytes = require('pretty-bytes');
var spawn = require("child_process");
var shell = require('shell');
var fs = require("fs");
var uuid = require("uuid/v4");
var isRunning = require("is-running");
var findProcess = require("find-process");
var CONFIG_PATH = process.env["HOME"] + "/tunnels.json";
var config = {};
var processes = {};

var start = function(id) {
    console.log("Starting " + id);
    $("#start" + id).attr("disabled", true);
    $("#stop" + id).attr("disabled", false);

    var server = config.servers.filter(function(value) {
        return value.id === id;
    });
    if (server) {
        var cmd = "ssh -A -NL " + server[0].localPort + ":" + server[0].host + ":" + server[0].remotePort + " " + server[0].bastion + " ";
        console.log("Starting ssh-tunnel " + cmd);
        var proc = spawn.exec(cmd);
        console.log(proc);
        processes[id] = proc;
        proc.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        proc.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        proc.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });

        for (var i = 0; i < config.servers.length; i++) {
            if (config.servers[i].id === id) {
                config.servers[i].pid = proc.pid;
            }
        }
        saveJson(config);

    }
};

var stop = function(id) {
    console.log("Stopping " + id);
    $("#start" + id).attr("disabled", false);
    $("#stop" + id).attr("disabled", true);

    var proc = processes[id];

    var i = 0;

    if (proc) {
        proc.kill();
        for (i = 0; i < config.servers.length; i++) {
            if (config.servers[i].id === id) {
                delete config.servers[i].pid;
            }
        }
    } else {
        for (i = 0; i < config.servers.length; i++) {
            if (config.servers[i].id === id && config.servers[i].pid) {
                findProcess('pid', config.servers[i].pid).then(function (list) {
                    console.log(list);
                    for (var j = 0; j < list.length; j++) {
                        if (list[j].cmd.indexOf("ssh") >= 0) {
                            process.kill(list[j].pid);
                        }
                    }
                });
                delete config.servers[i].pid;
            }
        }
    }


    saveJson(config);
};

var showEditRow = function(id) {
    // todo implement edit functionality.
};

var saveJson = function(data) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
};


$(function() {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH));

    console.log(config);
    var i = 0;
    for (i = 0; i < config.servers.length; i++) {
        if (!config.servers[i].id) {
            config.servers[i].id = uuid();
        }
        if (config.servers[i].pid && !isRunning(config.servers[i].pid)) {       /// todo check and make sure it is an ssh tunnel before killing.
            findProcess('pid', config.servers[i].pid).then(function (list) {
                console.log(list);
                for (var j = 0; j < list.length; j++) {
                    if (list[j].cmd.indexOf("ssh") >= 0) {
                        process.kill(list[j].pid);
                    }
                }
            });

            delete config.servers[i].pid;
        }
    }

    servers = config.servers;

    saveJson(config);


    var connectionsContainer = $(".connections");

    for (i = 0; i < servers.length; i++) {
        connectionsContainer.append("<tr id=\"" + servers[i].id + "\" " +
            "oncontextmenu='showEditRow(\"" + servers[i].id + "\")'>" +
            "<td>" + servers[i].name + "</td>" +
            "<td>" + servers[i].host + "</td>" +
            "<td>" + servers[i].localPort + "</td>" +
            "<td>" + servers[i].remotePort + "</td>" +
            "<td>" + "Status" + "</td>" +
            "<td>" +

            "<button id='start" + servers[i].id + "' " +
            "onclick='start(\"" + servers[i].id + "\")' " +
            "class=\"mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored\" " +
            ">" +
            "Start" +
            "</button>" +

            "<button id='stop" + servers[i].id + "' onclick='stop(\"" + servers[i].id + "\")' " +
            "class=\"mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent\">" +
            "Stop" +
            "</button>" +

            "</td>" +
            "</tr>");

        if (servers[i].pid) {
            $("#start" + servers[i].id).attr("disabled", true);
            $("#stop" + servers[i].id).attr("disabled", false);
        } else {
            $("#start" + servers[i].id).attr("disabled", false);
            $("#stop" + servers[i].id).attr("disabled", true);
        }
    }


});