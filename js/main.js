var lastfmUsername;// = document.getElementById("usernameInput").value;
var lastfmMetric;// = document.getElementById("chartMetric").value;
var lastfmTimeframe;// = document.getElementById("chartTimeframe").value;
var lastfmReturnLimit;// = document.getElementById("chartSize").value;
var durationDict;// = []
var tracksWithNoTime;

function createCharts() {
    durationDict = [];
    tracksWithNoTime = [];
    lastfmUsername = document.getElementById("usernameInput").value;
    lastfmMetric = document.getElementById("chartMetric").value;
    lastfmTimeframe = document.getElementById("chartTimeframe").value;
    lastfmReturnLimit = document.getElementById("chartSize").value;
//    console.log(lastfmUsername,lastfmMetric,lastfmTimeframe,lastfmReturnLimit)
    
    if (lastfmMetric == "artist"){
        document.getElementById("loadingMessages").innerHTML = "Gathering artists..."
//        var artistDuration = [];
        var artistsList = [];
        var promiseArtist = new Promise(function(resolve, reject) {
            var restAPIcall = "https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=" + lastfmUsername + "&period=" + lastfmTimeframe + "&limit=" + lastfmReturnLimit + "&api_key=bc139a6bdeaa921ed70e49ca9a21f683&format=json";
            var request = new XMLHttpRequest();
            request.open('GET', restAPIcall, true);
            request.onload = function() {
                var data = JSON.parse(this.response);
                try {
                    for (var i = 0; i < data.topartists.artist.length; i++) {
                        artistsList.push(data.topartists.artist[i].name);
                        durationDict.push({artistName:data.topartists.artist[i].name, duration:0});
                        if (durationDict.length == lastfmReturnLimit) {
    //                        console.log(durationDict);
                            resolve();
                        }
        //                document.getElementById("chartOutput").innerHTML += data.topartists.artist[i].name + " " + data.topartists.artist[i].playcount + "<br>";
                    }
                }
                catch(err) {
                    console.log(err);
                    alert("Username not found.");
                    document.getElementById("loadingMessages").innerHTML = ""
                    return;
                }
            }
            request.send();
        });
        
        promiseArtist.then(function () {
            document.getElementById("loadingMessages").innerHTML = "Collecting Tracks..."
            gatherTracks(artistsList).then(function () {
                document.getElementById("loadingMessages").innerHTML = ""
                document.getElementById("chartOutput").innerHTML = ""
                durationDict.sort(function(a, b){
                    return b.duration - a.duration;
                });
                durationDict.forEach(function(entry) {
                    var hours = Math.floor(entry.duration/3600)
                    var minutes = Math.floor((entry.duration-(Math.floor(entry.duration/3600)*3600))/60)
                    var seconds = entry.duration-Math.floor(entry.duration/3600)*3600-Math.floor((entry.duration-(Math.floor(entry.duration/3600)*3600))/60)*60
                    document.getElementById("chartOutput").innerHTML += entry.artistName + ": " + hours + ":" + minutes.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + ":" + seconds.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + " playtime.<br>"

    //                    var table = document.getElementById("dymanictable");
    //                    var rowCount = table.rows.length;
    //                    var row = table.insertRow(rowCount);
    //                    row.insertCell(0).innerHTML= entry.artistName;
    //                    row.insertCell(1).innerHTML= hours + ":" + minutes.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + ":" + seconds.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
    //                    row.insertCell(2).innerHTML= ccar.value;
                });
//                console.log("These tracks have no time data: ",tracksWithNoTime);
                document.getElementById("popUpBox").innerHTML = tracksWithNoTime.join("<br>") + "<br>";
                document.getElementById("badDataButton").style.display = "block";
            });
        });
    } else if (lastfmMetric == "album") {
        console.log("to be done later")
    }
    
  
  
}

function gatherTracks(listofNamesTemp) {
    return new Promise (function(resolve) {
        var restAPIcallTwo = "https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=" + lastfmUsername + "&period=" + lastfmTimeframe + "&limit=1000&page=1&api_key=bc139a6bdeaa921ed70e49ca9a21f683&format=json";
        var totalPageLimit;
        var promises = [];
        var requestTwo = new XMLHttpRequest();
        requestTwo.onreadystatechange=function() {
            if (requestTwo.readyState === 4) {
                if (requestTwo.status === 200) {
                    
                } else {
                    console.log("Last.fm returned "+requestTwo.status+" error on page check.");
                    if (requestTwo.status === 500) {
                        gatherTracks(listofNames)
                    }
                }
            }
        }
        requestTwo.open('GET', restAPIcallTwo, true);
        requestTwo.onload = function() {
            var data = JSON.parse(this.response);
            totalPageLimit = Number(data.toptracks['@attr'].totalPages);
//            console.log("Total Pages = "+totalPageLimit);
//            var totalTracks = data.toptracks['@attr'].total;
            for (var j = 1; j < totalPageLimit+1; j++) {
                promises.push(gatherTracksPerPage(listofNamesTemp, j));
            }
            promiseProgress(promises,function(results) {
                document.getElementById("loadingMessages").innerHTML = "Calculating Track durations... Completed pages "+results+" out of "+totalPageLimit;
            })
            Promise.all(promises).then(function(results) {
               resolve(); 
            });
        }
        requestTwo.send();
    });
}

function gatherTracksPerPage(listofNames, currentPage) {
    return new Promise (function(resolve) {
        var restAPIcallThree = "https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=" + lastfmUsername + "&period=" + lastfmTimeframe + "&limit=1000&page=" + currentPage + "&api_key=bc139a6bdeaa921ed70e49ca9a21f683&format=json";
        var requestThree = new XMLHttpRequest();
        requestThree.onreadystatechange=function() {
            if (requestThree.readyState === 4) {
                if (requestThree.status === 200) {
                    
                } else {
                    console.log("Last.fm returned "+requestThree.status+" error. Page "+currentPage+" was lost. Trying again for more accurate results.");
                    resolve();
                    if (requestThree.status === 500) {
                        promises.push(gatherTracksPerPage(listofNames,currentPage));
                    }
                }
            }
        }
        requestThree.open('GET', restAPIcallThree, true);
        requestThree.onload = function() {
            var data = JSON.parse(this.response);
            try {
                for (var i = 0; i < data.toptracks.track.length; i++) {
    //                console.log("working on track "+i);
                    if (listofNames.includes(data.toptracks.track[i].artist.name)) {
                        for (var d = 0; d < durationDict.length; d++) {
                            if (durationDict[d].artistName == data.toptracks.track[i].artist.name) {
                                var addDuration = data.toptracks.track[i].playcount * data.toptracks.track[i].duration;
                                if (addDuration == 0 ) {
                                    tracksWithNoTime.push(data.toptracks.track[i].artist.name+" --- "+data.toptracks.track[i].name)
                                }
                                durationDict[d].duration += addDuration;
//                                console.log("Adding "+addDuration+" to "+durationDict[d].artistName)
                            }
                        }
                    }
                }
                resolve();
            }
            catch(err) {
                console.log("Caught error:", err)
            }
        }
        requestThree.send();
    });
}

function promiseProgress(proms, progress) {
    var d = 0;
    progress(0);
    for (var p = 0; p < proms.length; p++) {
        proms[p].then(function() {
            d++;
            progress(d);
        });
    }
    return Promise.all(proms)
}
