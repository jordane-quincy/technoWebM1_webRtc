/* See also:
    http://www.html5rocks.com/en/tutorials/webrtc/basics/
    https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/index.html

    https://webrtc-demos.appspot.com/html/pc1.html
*/

//FIXME: utiliser le localstorage à la fin du dév
var stockage = sessionStorage;
// est-ce que l'utilisateur a refuse le partage ?
var permissionRefused;

//des le chargement de la page
var usernameAlreadySaved = stockage.getItem("username");
if(usernameAlreadySaved != null){
  //on pré rempli l'input
  $('#username').val(usernameAlreadySaved);
  // et si le login est visible, on met le focus sur save
  if($('#modalLogin').css('display') != "none"){
    $('#saveInfoUserButton').focus();
  }
}
//si pas de couleur enregistree, on met celles par defaut :
if(stockage.getItem("colorMsgSent") == null){
  stockage.setItem("colorMsgSent", '#468847');
}
updateTextChatSentColor();

if(stockage.getItem("colorMsgReceived") == null){
  stockage.setItem("colorMsgReceived", '#3a87ad');
}
updateTextChatReceivedColor();

//maj couleur du texte
function updateTextChatSentColor(){
  var colorMsgSent = stockage.getItem("colorMsgSent");
  $('.textChatSent').css('color', colorMsgSent);
  $('#colorPickerMsgSent').val(colorMsgSent);
}
function updateTextChatReceivedColor(){
  var colorMsgReceived = stockage.getItem("colorMsgReceived");
  $('.textChatReceived').css('color', colorMsgReceived);
  $('#colorPickerMsgReceived').val(colorMsgReceived);
}

//ajout des images de smiley dans le bandeau
$("#smileyList").append(getSmileyDom(':)', './img/emoticons/27px-Face-smile.svg.png', true));
$("#smileyList").append(getSmileyDom(':(', './img/emoticons/27px-Face-sad.svg.png', true));
$("#smileyList").append(getSmileyDom(';)', './img/emoticons/27px-Face-wink.svg.png', true));
$("#smileyList").append(getSmileyDom(':D', './img/emoticons/27px-Face-grin.svg.png', true));
//retourne le html pour un smiley
function getSmileyDom(text,  imgLink, hasOnClickFunction){
  var onClickFunction = '';
  if(hasOnClickFunction) {
    onClickFunction = 'onclick="$(\'#messageTextBox\').val($(\'#messageTextBox\').val() + \''+ text +'\');"';
  }
  return '<img src="'+ imgLink +'" title="'+text+'" alt="'+text+'" '+ onClickFunction +' />';
}

var cfg = {"iceServers":[{"url":"stun:23.21.150.121"}]},
    con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] };

/* THIS IS ALICE, THE CALLER/SENDER */

var pc1 = new RTCPeerConnection(cfg, con),
    dc1 = null, tn1 = null;

// Since the same JS file contains code for both sides of the connection,
// activedc tracks which of the two possible datachannel variables we're using.
var activedc;

var pc1icedone = false;
var sdpConstraints = {
  optional: [],
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true
  }
}

$('#showLocalOffer').modal('hide');
$('#getRemoteAnswer').modal('hide');
$('#waitForConnection').modal('hide');
$('#modalLogin').modal('show');
$('#createOrJoin').hide();

$('#createBtn').click(function() {
    $('#showLocalOffer').modal('show');
    createLocalOffer();
});

$('#joinBtn').click(function () {
  navigator.getUserMedia = navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia
  navigator.getUserMedia({video: true, audio: true}, function (stream) {
    var video = document.getElementById('videoWebcam');
    video.src = window.URL.createObjectURL(stream);
    video.play();
    pc2.addStream(stream);
    permissionRefused = false;
  }, function (error) {
    console.log('Error adding stream to pc2: ' + error);
    permissionRefused = true;
  });
  //AVEC ou SANS flux, pas de différence ici
  $('#getRemoteOffer').modal('show');
});

$('#offerGoBackBtn').click(function() {
    $('#showLocalOffer').modal('hide');
    $('#createOrJoin').modal('show');
});
$('#offerSentBtn').click(function() {
    $('#getRemoteAnswer').modal('show');
});

$('#offerRecdBtn').click(function() {
    var offer = $('#remoteOffer').val();
    var offerDesc = new RTCSessionDescription(JSON.parse(offer));
    console.log("Received remote offer", offerDesc);
    writeToChatLog("Received remote offer", "text-success");
    handleOfferFromPC1(offerDesc);
    $('#showLocalAnswer').modal('show');
});

$('#answerGoBackBtn').click(function() {
    $('#showLocalAnswer').modal('hide');
    $('#createOrJoin').modal('show');
});
$('#answerSentBtn').click(function() {
    $('#waitForConnection').modal('show');
});

$('#offerRecdGoBackBtn').click(function() {
    $('#getRemoteOffer').modal('hide');
    $('#createOrJoin').modal('show');
});
$('#answerRecdBtn').click(function() {
    var answer = $('#remoteAnswer').val();
    var answerDesc = new RTCSessionDescription(JSON.parse(answer));
    handleAnswerFromPC2(answerDesc);
    $('#waitForConnection').modal('show');
});

$('#fileBtn').change(function() {
    var file = this.files[0];
    console.log(file);

    sendFile(file);
});

$('#avatar').change(function() {
  var img = this.files[0];
  // si c'est bien une image
  if (img.type.match('image.*')){
    //si poids image > à 2 Mo
    if( (img.size / 1024 / 1024) > 2 ){
      alert("L'avatar fait plus de 2 Mo. Merci d'en choisir un autre.");
    }else{
      // creation et configuration du lecteur de fichier
      var reader = new FileReader();
      reader.onload = function(){
        var avatarEnBase64 = reader.result; // via readAsDataURL, on aura directement : "data:image/png;base64,"+ l'image en base64
        //mise a jour de la preview
        $('#avatarImgLoaded').attr("src", avatarEnBase64);
      }
      reader.readAsDataURL(img);
    }
  }
});

$('#biggerText').click(function() {
  $('.well, #messageTextBox').css('font-size', parseInt($('.well').css('font-size')) * (1 + 15/100)); //taile actuelle + 15%
});
$('#smallerText').click(function() {
  $('.well, #messageTextBox').css('font-size', parseInt($('.well').css('font-size')) * (1 - 15/100)); //taile actuelle - 15%
});
$("#colorPickerMsgSent").change(function() {
  var colorPickedForMsgSent = $("#colorPickerMsgSent").val();
  stockage.setItem("colorMsgSent", colorPickedForMsgSent);
  updateTextChatSentColor();
});
$("#colorPickerMsgReceived").change(function() {
  var colorPickedForMsgReceived = $("#colorPickerMsgReceived").val();
  stockage.setItem("colorMsgReceived", colorPickedForMsgReceived);
  updateTextChatReceivedColor();
});
//envoi de notre avatar a l'autre personne
function sendAvatar() {
    var cleStockageImg = "avatar_"+ stockage.getItem("username");
    var channel = new RTCMultiSession();
    channel.send({
      type: 'avatar',
      username: stockage.getItem("username"),
      avatar: stockage.getItem(cleStockageImg)
    });

    return false;
};

/**
 * Function pour save les info des utilisateurs
 * @return {[type]} [description]
 */
function saveInfoUser() {
    var username = $("#username").val();
    stockage.setItem("username", username);
    var avatarImgLoadedSrc = $("#avatarImgLoaded").attr("src");
    //Si pas d'avatar, on met un avatar par défaut
    if (!avatarImgLoadedSrc) {
        avatarImgLoadedSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAmCAYAAACoPemuAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuOWwzfk4AAAImSURBVFhHxdgxS5tRGMXxBLVIrVOpCEI/QRylinSyFIQ6tJO7c0EdnFzcSgdLJ/0KguCnsEuHdtEuHSu6FCra0g41/g9JSPKY3Pe598Y3B34kb3Lvcw8JxpBKvV6vZKSG9/iMS9w0b3Wtx/V8WhKLTeMAKqIB/eh5rdP6uCQUm8MFbImQc2ifP5HF9Nb8gj3YQ/v8b21EsXF8gz0whvZrTnEiim3BHpRCc4rjLDaKM9hDUvzACMJxFluEPSCH5oXjLLYJOzyH5oXjLLYLOzyH5oXjLPYRdngOzQvHWWwbdngOzQvHWWwFdngOzQvHWWwSv2EPSHGNRwjHWUzZhz0kheYUJ6LYDPSVxh4UQ/s1pzgRxZRVFH3V6Uf7tN+XyGLKW/yHPThE67XPn4RiyjL0P88W6EXrtD4uicWUCWzgK+zbq+svWIfWxSejWGceYwEvm7e6zktGsQd4gR0c4hP0Kh03r/X4ErQuPgnFnuIDfqL11oVondZrnz8RxR7iHf7CHu6hfdqvOcVxFptF7vf9Fs3RvHAcxfSnfgV7QA7NC3+EFBR7hX+wgwdBczW/dwLF5vEHduAgaf4z3E2fYlPwfrLn0jlP0J0+xY5gB9wnndedHsXewG4sw2u0Y4rpU/o77KYy6NwxNGKKrcFuKJPOb6SjWBWnsIvLdAL14Kpd7DnswmFQD+61i+3BLhoG9eBeo5hevkH9mpNLPaqtYvqlzy4YokrtFnc8aQAxJLP+AAAAAElFTkSuQmCC";
    }
    stockage.setItem(getCleStockageAvatarImg(username), avatarImgLoadedSrc);

    if (!username) {
        //Affichae d'un message d'erreur et ajout d'un placeholder sur l'input (en rouge)
        document.getElementById("errorInputUserInfo").innerHTML = "Vous n'avez pas rempli votre username";
        $("#username").attr('placeholder', 'Entrez votre username');
    }
    else {
        //On cache le formulaire
        $("#modalLogin").modal("hide");
        //On affiche la modal de création ou de join de room
        $('#createOrJoin').modal('show');
    }
}
// l'ensemble des avatars est stocke sous une forme particuliere
function getCleStockageAvatarImg(username){
  return "avatar_"+username;
}

function fileSent(file) {
    console.log(file + " sent");
}

function fileProgress(file) {
    console.log(file + " progress");
}

function sendFile(data) {
    if (data.size) {
        FileSender.send({
          file: data,
          onFileSent: fileSent,
          onFileProgress: fileProgress,
        });
    }
}

function sendMessage() {
    if ($('#messageTextBox').val()) {
        var username = stockage.getItem('username');
        var channel = new RTCMultiSession();
        writeToChatLog($('#messageTextBox').val(), "textChatSent", username);
        updateTextChatSentColor();
        channel.send({
          message: $('#messageTextBox').val(),
          username: username
        });
        $('#messageTextBox').val("");

        // Scroll chat text area to the bottom on new input.
        $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
    }

    return false;
};

function setupDC1() {
    try {
        var fileReceiver1 = new FileReceiver();
        dc1 = pc1.createDataChannel('test', {reliable:true});
        activedc = dc1;
        console.log("Created datachannel (pc1)");
        dc1.onopen = function (e) {
            console.log('data channel connect');
            $('#waitForConnection').modal('hide');
            $('#waitForConnection').remove();
           //on transmet l'avatar
           sendAvatar();
           //on transmet la permission
           sendPermissionRefused();
        }
        dc1.onmessage = function (e) {
            console.log("Got message (pc1)", e.data);
            if (e.data.size) {
                fileReceiver1.receive(e.data, {});
            }
            else {
                if (e.data.charCodeAt(0) == 2) {
                   // The first message we get from Firefox (but not Chrome)
                   // is literal ASCII 2 and I don't understand why -- if we
                   // leave it in, JSON.parse() will barf.
                   return;
                }
                console.log(e);
                var data = JSON.parse(e.data);
                if (data.type === 'file') {
                    fileReceiver1.receive(e.data, {});
                }else if (data.type === 'avatar') {
                  addAvatarToGallery(data.username, data.avatar);
                }else if (data.type === 'permissionRefused') {
                  if(data.value){
                    hideAllWebcam();
                  }
                }
                else {
                    writeToChatLog(data.message, "textChatReceived", data.username);
                    updateTextChatReceivedColor();
                    // Scroll chat text area to the bottom on new input.
                    $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
                }
            }
        };
    } catch (e) { console.warn("No data channel (pc1)", e); }
}

function setupAndcreateOffer(){
  setupDC1();
  pc1.createOffer(function (desc) {
    pc1.setLocalDescription(desc, function () {}, function () {});
    console.log('created local offer', desc);
  },function () { console.warn("Couldn't create offer"); },
  sdpConstraints);
}
function createLocalOffer () {
  console.log('video1');
  navigator.getUserMedia = navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia;

  navigator.getUserMedia({video: true, audio: true}, function (stream) {
    var video = document.getElementById('videoWebcam');
    video.src = window.URL.createObjectURL(stream);
    video.play();
    pc1.addStream(stream);
    console.log(stream);
    console.log('adding stream to pc1');
    //creation offre AVEC flux
    permissionRefused = false;
    setupAndcreateOffer();
  }, function (error) {
    console.log('Error adding stream to pc1: ' + error);
    //creation offre SANS flux
    permissionRefused = true;
    setupAndcreateOffer();
});

}

function sendPermissionRefused() {
    console.log("sendPermissionRefused, refused ? " + permissionRefused );
    if(permissionRefused){
      hideAllWebcam();
    }
    var channel = new RTCMultiSession();
    channel.send({
      type: 'permissionRefused',
      value: permissionRefused
    });
};

pc1.onicecandidate = function (e) {
    console.log("ICE candidate (pc1)", e);
    if (e.candidate == null) {
        $('#localOffer').html(JSON.stringify(pc1.localDescription));
    }
};

function handleOnaddstream (e) {
  console.log('Got remote stream', e.stream)
  var el = document.getElementById('remoteVideo')
  el.autoplay = true
  attachMediaStream(el, e.stream)
}

pc1.onaddstream = handleOnaddstream

function handleOnconnection() {
    console.log("Datachannel connected");
    writeToChatLog("Datachannel connected", "text-success");
    $('#waitForConnection').modal('hide');
    // If we didn't call remove() here, there would be a race on pc2:
    //   - first onconnection() hides the dialog, then someone clicks
    //     on answerSentBtn which shows it, and it stays shown forever.
    $('#waitForConnection').remove();
    $('#showLocalAnswer').modal('hide');
    $('#messageTextBox').focus();
}

pc1.onconnection = handleOnconnection;

function onsignalingstatechange(state) {
    console.info('signaling state change:', state);
}

function oniceconnectionstatechange(state) {
    console.info('ice connection state change:', state);
}

function onicegatheringstatechange(state) {
    console.info('ice gathering state change:', state);
}

pc1.onsignalingstatechange = onsignalingstatechange;
pc1.oniceconnectionstatechange = oniceconnectionstatechange;
pc1.onicegatheringstatechange = onicegatheringstatechange;

function handleAnswerFromPC2(answerDesc) {
    console.log("Received remote answer: ", answerDesc);
    writeToChatLog("Received remote answer", "text-success");
    pc1.setRemoteDescription(answerDesc);
}

function handleCandidateFromPC2(iceCandidate) {
    pc1.addIceCandidate(iceCandidate);
}


/* THIS IS BOB, THE ANSWERER/RECEIVER */

var pc2 = new RTCPeerConnection(cfg, con),
    dc2 = null;

var pc2icedone = false;

pc2.ondatachannel = function (e) {
    var fileReceiver2 = new FileReceiver();
    var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
    console.log("Received datachannel (pc2)", arguments);
    dc2 = datachannel;
    activedc = dc2;
    dc2.onopen = function (e) {
        console.log('data channel connect');
        $('#waitForConnection').modal('hide');
        $('#waitForConnection').remove();
        //on transmet l'avatar
        sendAvatar();
        //on transmet la permission
        sendPermissionRefused();
    }
    dc2.onmessage = function (e) {
        console.log("Got message (pc2)", e.data);
        if (e.data.size) {
            fileReceiver2.receive(e.data, {});
        }
        else {
            var data = JSON.parse(e.data);
            if (data.type === 'file') {
                fileReceiver2.receive(e.data, {});
            }else if (data.type === 'avatar') {
              addAvatarToGallery(data.username, data.avatar);
            }else if (data.type === 'permissionRefused') {
              if(data.value){
                hideAllWebcam();
              }
            }
            else {
                writeToChatLog(data.message, "textChatReceived", data.username);
                updateTextChatReceivedColor();
                // Scroll chat text area to the bottom on new input.
                $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
            }
        }
    };
};

function hideAllWebcam(){
  console.log("hideAllWebcam");
  $("#videoContainer").hide();
}

function handleOfferFromPC1(offerDesc) {
    pc2.setRemoteDescription(offerDesc);
    pc2.createAnswer(function (answerDesc) {
        writeToChatLog("Created local answer", "text-success");
        console.log("Created local answer: ", answerDesc);
        pc2.setLocalDescription(answerDesc);
    }, function () { console.warn("No create answer"); });
}

pc2.onicecandidate = function (e) {
    console.log("ICE candidate (pc2)", e);
    if (e.candidate == null)
       $('#localAnswer').html(JSON.stringify(pc2.localDescription));
};

pc2.onsignalingstatechange = onsignalingstatechange;
pc2.oniceconnectionstatechange = oniceconnectionstatechange;
pc2.onicegatheringstatechange = onicegatheringstatechange;

function handleCandidateFromPC1(iceCandidate) {
    pc2.addIceCandidate(iceCandidate);
}


pc2.onaddstream = handleOnaddstream
pc2.onconnection = handleOnconnection
/*
pc2.onaddstream = function (e) {
    console.log("Got remote stream", e);
    var el = new Audio();
    el.autoplay = true;
    attachMediaStream(el, e.stream);
};

pc2.onconnection = handleOnconnection;
*/
function getTimestamp() {
    var totalSec = new Date().getTime() / 1000;
    var hours = parseInt(totalSec / 3600) % 24;
    var minutes = parseInt(totalSec / 60) % 60;
    var seconds = parseInt(totalSec % 60);

    var result = (hours < 10 ? "0" + hours : hours) + ":" +
                 (minutes < 10 ? "0" + minutes : minutes) + ":" +
                 (seconds  < 10 ? "0" + seconds : seconds);

    return result;
}

function replaceSmileyByImg(texteOriginal){
  //img src : https://en.wikipedia.org/wiki/Wikipedia:Emoticons
  var texteAvecImg = texteOriginal;
  texteAvecImg = texteAvecImg.replace(/:\)/g, getSmileyDom(':)', './img/emoticons/27px-Face-smile.svg.png'));
  texteAvecImg = texteAvecImg.replace(/:\(/g, getSmileyDom(':(', './img/emoticons/27px-Face-sad.svg.png'));
  texteAvecImg = texteAvecImg.replace(/;\)/g, getSmileyDom(';)', './img/emoticons/27px-Face-wink.svg.png'));
  texteAvecImg = texteAvecImg.replace(/:D/g, getSmileyDom(':D', './img/emoticons/27px-Face-grin.svg.png'));
  return texteAvecImg;
}

function addAvatarToGallery(username, avatar){
  if (!avatar) {
      avatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAmCAYAAACoPemuAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuOWwzfk4AAAImSURBVFhHxdgxS5tRGMXxBLVIrVOpCEI/QRylinSyFIQ6tJO7c0EdnFzcSgdLJ/0KguCnsEuHdtEuHSu6FCra0g41/g9JSPKY3Pe598Y3B34kb3Lvcw8JxpBKvV6vZKSG9/iMS9w0b3Wtx/V8WhKLTeMAKqIB/eh5rdP6uCQUm8MFbImQc2ifP5HF9Nb8gj3YQ/v8b21EsXF8gz0whvZrTnEiim3BHpRCc4rjLDaKM9hDUvzACMJxFluEPSCH5oXjLLYJOzyH5oXjLLYLOzyH5oXjLPYRdngOzQvHWWwbdngOzQvHWWwFdngOzQvHWWwSv2EPSHGNRwjHWUzZhz0kheYUJ6LYDPSVxh4UQ/s1pzgRxZRVFH3V6Uf7tN+XyGLKW/yHPThE67XPn4RiyjL0P88W6EXrtD4uicWUCWzgK+zbq+svWIfWxSejWGceYwEvm7e6zktGsQd4gR0c4hP0Kh03r/X4ErQuPgnFnuIDfqL11oVondZrnz8RxR7iHf7CHu6hfdqvOcVxFptF7vf9Fs3RvHAcxfSnfgV7QA7NC3+EFBR7hX+wgwdBczW/dwLF5vEHduAgaf4z3E2fYlPwfrLn0jlP0J0+xY5gB9wnndedHsXewG4sw2u0Y4rpU/o77KYy6NwxNGKKrcFuKJPOb6SjWBWnsIvLdAL14Kpd7DnswmFQD+61i+3BLhoG9eBeo5hevkH9mpNLPaqtYvqlzy4YokrtFnc8aQAxJLP+AAAAAElFTkSuQmCC";
  }
  stockage.setItem(getCleStockageAvatarImg(username),  avatar);

  console.log("try to add '"+ username +"' to gallery");
  if($('#avatarGallery').is(':empty') && avatar != null && avatar != "undefined") {
    $('#avatarGallery').append('<p>'+ username +' <img title=\"'+ username +'\" alt=\"\" src=\"' + avatar +'\" >'+ '</p>');
  }
}

function writeToChatLog(message, message_type, username) {
    var fromUsername = "";
    var fromAvatar = "";
    if(username != null){
      fromUsername = "|"+ username +"| ";

      var avatarSaved = stockage.getItem(getCleStockageAvatarImg(username));
      if(avatarSaved != null){
        fromAvatar = '<img class=\"fromAvatar\" title=\"'+ username +'\" alt=\"\" src=\"' + avatarSaved +'\" >';
      }
    }

    message = replaceSmileyByImg(message);

    document.getElementById('chatlog').innerHTML += '<p class=\"' + message_type + '\">'+ fromAvatar + "[" + getTimestamp() + "] " + fromUsername + message + '</p>';
}
