(function(){

    const params = new URLSearchParams(window.location.search);
    if (params.has("debug")) {
        var cbdvr_debug = true;
        console.log("Debug mode active!");
    }

    document.addEventListener("DOMContentLoaded", Main, false);

    
    function Main(){
        //console.log("Chaturbate DVR Script Loaded")
        
        // Handle user disabled scrolling
        document.body.addEventListener("htmx:sseBeforeMessage", function (e) {
            var sseInfo = sseParseEvent(e);
            if ( sseInfo.log_type === "log" ) {
                if ( !e.detail.elt.closest(".ts-box").querySelector("[type=checkbox]").checked ) {
                    e.preventDefault();
                } 
            }
        })
          
        

        // ▀█▀ ░█▄─░█ ░█▀▀█ ░█─░█ ▀▀█▀▀ 　 ░█▀▀▀ ▀█▀ ░█─── ▀▀█▀▀ ░█▀▀▀ ░█▀▀█ 
        // ░█─ ░█░█░█ ░█▄▄█ ░█─░█ ─░█── 　 ░█▀▀▀ ░█─ ░█─── ─░█── ░█▀▀▀ ░█▄▄▀ 
        // ▄█▄ ░█──▀█ ░█─── ─▀▄▄▀ ─░█── 　 ░█─── ▄█▄ ░█▄▄█ ─░█── ░█▄▄▄ ░█─░█

    
        
        // This just enables the ability to paste a chaturbate URL into the username input field
        // and it will automatically extract the username from it.

        document.getElementById('username-input').addEventListener('input', function (e) {
            let value = e.target.value.trim();

            // If it's a chaturbate URL, extract the username
            if (value.includes('chaturbate.')) {
                let match = value.match(/^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?chaturbate\.[a-z.]+\/([^\/\s?#]+)/i);
                if (match) {
                    value = match[1];
                }
            }

            // Sanitize for CSV-style input by removing empty values
            const cleaned = value
                .split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0)
                .join(',');

            e.target.value = cleaned;
        });
        // ================================================================================================





        // ░█▀▀▀█ ░█▀▀▀█ ░█▀▀█ ▀▀█▀▀ 
        // ─▀▀▀▄▄ ░█──░█ ░█▄▄▀ ─░█── 
        // ░█▄▄▄█ ░█▄▄▄█ ░█─░█ ─░█──



        //-----
        var ListSorter = (function() {
            var lastOrder = [];
            var lastUserMoved = 0;
            var lastAnimationTs = new Date().getTime();
            var timeout_reference;
            var isAnimating = false;

            const ANIMATION_TIME_MS = 2000;

            // Helper to compare two arrays element by element
            function arraysAreEqual(arr1, arr2) {
                return arr1.length === arr2.length && arr1.every((val, i) => val === arr2[i]); 
            }

            function getSortPriority(el) {
                // Using a simple text content check for the '.ts-badge'
                var badgeEl = el.querySelector('.ts-badge');
                var badgeText = badgeEl ? badgeEl.textContent.trim() : '';
                switch (badgeText) {
                    case 'RECORDING': return 0;
                    case 'QUEUED':    return 1;
                    case 'BLOCKED':   return 2;
                    case 'OFFLINE':   return 3;
                    case 'PAUSED':    return 4;
                }
                return 5;
            }
        
            function sortRows() {
                
                var now = new Date().getTime();
                
                if( isAnimating ) return; // If we're already animating then we return ( a new check will be called when the animation completes )
                if ( ( now - lastUserMoved ) < 1000 ) return setTimeout(function(){ sortRows()},500); // delay the animation due to userinteaction ( mouse move )

                let container = document.querySelector('.ts-wrap');
                let boxes = Array.prototype.slice.call( container.querySelectorAll('.channel-box') );
                
                // Sort the boxes based on status priority and channel name
                boxes.sort(function(a, b) {
                    let pa = getSortPriority(a);
                    let pb = getSortPriority(b);
                    if (pa !== pb) return pa - pb;
                    return getChannelNameFromElement(a).localeCompare( getChannelNameFromElement(b) );
                });

                // Build the new order array of header texts
                let newOrder = boxes.map(function(box) { return getChannelNameFromElement(box)});
                
                // If the order hasn't changed, skip reordering and animation
                if (arraysAreEqual(newOrder, lastOrder)) { 
                    return;
                }

                
                let positions = new Map();
                boxes.forEach(function(box) { positions.set(box, box.getBoundingClientRect());}); // Store initial positions
                boxes.forEach(function(box) { container.appendChild(box); }); // Append in new order to the container

                // Animate movement using gsap
                isAnimating = true;
                boxes.forEach(function(box) {
                    let oldPos = positions.get(box);
                    let newPos = box.getBoundingClientRect();
                    let from = { x: oldPos.left - newPos.left, y: oldPos.top  - newPos.top }
                    let to = { x: 0, y: 0, duration: ANIMATION_TIME_MS/1000, ease: "back.inOut(1.1)" } /*"power2.inOut" */ 
                    
                    // Scroll non collapsed texareas
                    var textarea = box.closest(".js-is-collapsed") ? null : box.querySelector("textarea");
                    if( textarea ) { 
                        to.onUpdate = function() { 
                            scrollLogTextarea( textarea );
                        };    
                    }
                    to.onComplete = function(){
                        isAnimating = false; // Allow new animation
                        setTimeout(function(){sortRows();},500)
                    }                       
                    gsap.fromTo( box, from, to );
                });

                lastOrder = newOrder; // Update lastOrder to the new order for next time
            }

            // Listen to mouse movements (this was used before for potential delays)
            document.body.addEventListener('mousemove', function(e) {
                lastUserMoved = new Date().getTime();
            });

            return {
                updateSort: function() {
                    setTimeout( sortRows , 1000 );
                }
            };
        })();
        // ================================================================================================


       

        


        // ░█▀▀▀ ░█▀▀▄ ▀█▀ ▀▀█▀▀ 　 ░█▀▀▄ ▀█▀ ─█▀▀█ ░█─── ░█▀▀▀█ ░█▀▀█ 
        // ░█▀▀▀ ░█─░█ ░█─ ─░█── 　 ░█─░█ ░█─ ░█▄▄█ ░█─── ░█──░█ ░█─▄▄ 
        // ░█▄▄▄ ░█▄▄▀ ▄█▄ ─░█── 　 ░█▄▄▀ ▄█▄ ░█─░█ ░█▄▄█ ░█▄▄▄█ ░█▄▄█
                

        // Edit Channel Dialog          
        var EditChannelDialog = (function() {
            
            var title_text
            var submit_text

            function onDialogClose() {
                // Reset the dialog state when closed
                document.getElementById('edit-flag').value = "false";
                document.querySelector('#create-dialog .ts-header').textContent = title_text;
                document.querySelector('#create-dialog button[type="submit"]').textContent = submit_text;
                
                // Remove the close handler
                document.getElementById('create-dialog').removeEventListener('close', onDialogClose);
                
                // reset
                const input = document.getElementById('username-input');
                input.readOnly = false;
                input.style.opacity = "1";
            }  
            

            function onSubmit(e) {
                /* */ 
            }

            function timeStringToMinutes(timeStr) {
                if(!timeStr) return 0
                const [hours, minutes, seconds] = timeStr.split(':').map(Number);
                return hours * 60 + minutes + Math.floor(seconds / 60);
            }

            function open( username ) {
                fetch('/api/channel/' + encodeURIComponent( username ))
                    .then(res => res.json())
                    .then(data => {
                        // Set edit flag
                        document.getElementById('edit-flag').value = "true";

                        const input = document.getElementById('username-input');
                        input.value = data.Username || "";
                        input.readOnly = true;
                        input.style.opacity = "0.5";
                        
                        // Fill fields
                        document.querySelector('select[name="resolution"]').value   = data.Resolution   || 1080
                        document.querySelector('input[name="priority"]').value      = data.Priority     || 0
                        document.querySelector('input[name="max_filesize"]').value  = data.MaxFilesizeInt  || 0;
                        document.querySelector('input[name="max_duration"]').value  = data.MaxDurationInt || 0; 
                        document.querySelector('input[name="pattern"]').value       = data.Pattern      || "";

                        title_text = document.querySelector('#create-dialog .ts-header').textContent
                        submit_text = document.querySelector('#create-dialog button[type="submit"]').textContent

                        // Change dialog title/button if editmode
                        document.querySelector('#create-dialog .ts-header').textContent = "Edit Channel";
                        document.querySelector('#create-dialog button[type="submit"]').textContent = "Save Changes";
                        document.querySelector('#create-dialog form').addEventListener("submit", onSubmit);

                        // Set close handler
                        document.getElementById('create-dialog').addEventListener('close', onDialogClose);

                        // Open the dialog
                        document.getElementById('create-dialog').showModal();
                        //console.log("Editing channel: ", data)
                });
            }
            return {
                open: open
            }
        })()
        // ================================================================================================





        // ░█▀▀▄ ░█▀▀▀ ░█─── ░█▀▀▀ ▀▀█▀▀ ░█▀▀▀ 　 ░█▀▀█ ░█▀▀█ ░█▀▀▀█ ░█▀▄▀█ ░█▀▀█ ▀▀█▀▀ 
        // ░█─░█ ░█▀▀▀ ░█─── ░█▀▀▀ ─░█── ░█▀▀▀ 　 ░█▄▄█ ░█▄▄▀ ░█──░█ ░█░█░█ ░█▄▄█ ─░█── 
        // ░█▄▄▀ ░█▄▄▄ ░█▄▄█ ░█▄▄▄ ─░█── ░█▄▄▄ 　 ░█─── ░█─░█ ░█▄▄▄█ ░█──░█ ░█─── ─░█──

        

        function confirmChannelDeletion (channel_id, event ) {
            //console.log(channel_id)
            var modal = document.getElementById('delete-confirm');
            if(!modal) return console.error("No delete-confirm modal found in the document.");
          
            modal.querySelector('.channel-name').innerHTML = channel_id;
            modal.querySelector('.channel-thumbnail').style.backgroundImage = "url('./channel-images/" + channel_id + ".jpg'), url('static/default_user.png')";;
            modal.querySelector('.btn-ok').onclick = function() {
                fetch('/stop_channel/' + channel_id, { method: 'POST' }).then(function(response) {
                    if (response.ok) {
                        // Optionally, you can refresh the page or update the UI after deletion
                        location.reload();
                    } else {
                        console.error("Failed to delete channel:", channel_id);
                    }
                }); 
            };
     
            modal.showModal();
        }
        // ================================================================================================







                
        // ░█▀▀█ ░█▀▀▀█ ░█─── ░█─── ─█▀▀█ ░█▀▀█ ░█▀▀▀█ ▀█▀ ░█▀▀█ ░█─── ░█▀▀▀ 
        // ░█─── ░█──░█ ░█─── ░█─── ░█▄▄█ ░█▄▄█ ─▀▀▀▄▄ ░█─ ░█▀▀▄ ░█─── ░█▀▀▀ 
        // ░█▄▄█ ░█▄▄▄█ ░█▄▄█ ░█▄▄█ ░█─░█ ░█─── ░█▄▄▄█ ▄█▄ ░█▄▄█ ░█▄▄█ ░█▄▄▄




        function onCollapsibleClick( event ) {
            const collapseClass = "js-is-collapsed"
            const channel_box = event.target.closest('[channel-id]')
            let channel_id = channel_box.getAttribute("channel-id");
            var textarea = channel_box.querySelector("textarea");
            
            if ( channel_box ) {
                if (channel_box.classList.contains(collapseClass)) {
                    channel_box.classList.remove(collapseClass);
                    document.activeElement.blur();
                } else {
                    channel_box.classList.add(collapseClass);
                }
                
                // Temporarily disable scrollbar while animating ( looks better )
                textarea.style.overflowY = "hidden";
                setTimeout(function(){ textarea.style.overflowY = "auto";}, 600);

                // Make sure the logarea has text ( DOM updates are cancelled while collapsed )
                requestChannelUpdate(channel_id);
                //setTimeout( function () { requestChannelUpdate(channel_id) },1000); 
            } else {
                console.error('No parent .channel-box found for the clicked element.')
            }
            
        }
        // ================================================================================================





        // ░█▀▀█ ░█─── ▀█▀ ░█▀▀█ ░█─▄▀ ░█▀▀▀█ 
        // ░█─── ░█─── ░█─ ░█─── ░█▀▄─ ─▀▀▀▄▄ 
        // ░█▄▄█ ░█▄▄█ ▄█▄ ░█▄▄█ ░█─░█ ░█▄▄▄█


 
        var ClickHandler = (function(){
            
            // Gotta Catch 'Em All! 🦖🎵🎶

            function clickHandler(event) {
                //console.log( "channel_id " + channel_id )
                var channel_id = getChannelNameFromElement(event.target);
                
                if( event.target.closest('.btn-openweb') ) {
                    // OPEN ON WEBSITE
                    var site_url = document.querySelector(".content > .is-start-labeled > .label")?.textContent;
                    window.open(site_url +""+ channel_id+"/",'_blank');
                    return cancelEvent(event);

                }else if( event.target.closest('.btn-edit') ) {
                    // EDIT CHANNEL DIALOG
                    cbdvr.editChannel( channel_id )
                    return cancelEvent(event);

                }else if( event.target.closest('.btn-delete') ) {
                    // DELETE CHANNEL PROMPT
                    confirmChannelDeletion(channel_id);
                    return cancelEvent(event);    

                }else if( event.target.closest('.ch-status') ) {
                    // PAUSE/RESUME CHANNEL
                    event.target.closest('.ch-status-paused') ? resumeChannel( channel_id ) : pauseChannel( channel_id );
                    return cancelEvent(event);    
                
                }else if( event.target.closest('.channel-thumbnail') ) {
                    // THUMBNAIL REFRESH
                    let channel_info = ChannelTracker.getChannel(channel_id);
                    if( channel_info.status === "RECORDING" || channel_info.status === "QUEUED" ) {
                        // Channel is online
                        updateChannelThumbnail(channel_id)
                    }else {
                        // Channel is offline or paused, we just expand instead
                        onCollapsibleClick(event);
                    }
                    return cancelEvent(event);

                }else if ( event.target.closest(".menu-export-as-csv") ) {
                    // EXPORT CHANNELS LIST AS CSV
                    return cancelEvent(event);

                }else if ( event.target.closest(".menu-enable-debug") ) {
                    // ENABLE DEBUG
                    cbdvr.enableDebug(event);
                    return cancelEvent(event);

                }else  if( event.target.closest('.channel-header') ) {
                    // EXPAND/COLLAPSE LIST ITEM
                    onCollapsibleClick(event);
                    return cancelEvent(event);

                }                    
            };

            document.body.addEventListener('click', clickHandler); 
        })()

        // ================================================================================================






        // ▀▀█▀▀ ░█▀▀█ ─█▀▀█ ░█▀▀█ ░█─▄▀ 
        // ─░█── ░█▄▄▀ ░█▄▄█ ░█─── ░█▀▄─ 
        // ─░█── ░█─░█ ░█─░█ ░█▄▄█ ░█─░█


        //-----

        var ChannelTracker = (function (){
            
            var channels = {};

            const status_strings = ["OFFLINE","QUEUED","BLOCKED","PAUSED","RECORDING"];
           
            function prefetchChannelData( onComepleteHandler ){
                // Fetch channels from session storage , if it exist. Mainly to store image anticache value
                session_channels = JSON.parse( sessionStorage.getItem("channels") ) || {};
  
                getChannels(function(data){
                    for(var i = 0; i < data.length ; i++){
                        var chInfo = data[i]; // json object sent from go
                        var ch = getChannelObj( chInfo.Username ); // create our js tracking object                        
                        ch.status = chInfo.IsPaused ? "PAUSED" : chInfo.IsBlocked ? "BLOCKED" : chInfo.IsDownPrioritized ? "QUEUED" : chInfo.IsOnline ? "RECORDING" : "OFFLINE";
                        ch.thumbAnticache = session_channels[chInfo.Username] ? session_channels[chInfo.Username].thumbAnticache || 0 : 0;
                    }
                    onComepleteHandler() 
                })
            }

            function getStatusFromEventData(str) {
                str = str.toUpperCase();
                return status_strings.find(status => str.includes(status)) || null;
            }        
             
            function getChannelObj( channel_id  ){
                channels[channel_id] = channels[channel_id] || {
                    id: channel_id,
                    lastUpdateTs: Date.now(),
                    thumbAnticache: 0,
                    status: null,
                    dataTransferTracking : []
                }; // Create if not exist
                return channels[channel_id];
            }




            function inspectEvent(e) {
                const now = Date.now();
                const sseInfo = sseParseEvent(e);
                //console.log("sseInfo.log_type: "+sseInfo.log_type, e)
                if ( !sseInfo.channel_id ) return console.log("channel_id was nothing");

                const ch = getChannelObj( sseInfo.channel_id );
                ch.lastUpdateTs = now;
                if (sseInfo.log_type === "info") {

                    const status = getStatusFromEventData( e.detail.data );
                    if ( status && ch.status !== status ) {
                        // it changed, setting new reference and notifying;
                        ch.status = status;
                        ChannelTracker.onStatusUpdate( ch, e );
                    }
                } else if (sseInfo.log_type === "log") {
                    if( ch.status == "RECORDING" ) {
                        ChannelTracker.onRecordingUpdate( ch, e );
                    }
                        
                        
                }
            }

            function beforeSwapHandler(e){
                inspectEvent(e); 
                if ( e.detail.elt.closest(".js-is-collapsed") ) {
                    elm_debug_out_sse_skipped.innerHTML = ++debug_out_sse_skipped;
                    return e.preventDefault();
                }
                elm_debug_out_sse_passed.innerHTML = ++debug_out_sse_passed; 
            }

            function afterSwapHandler(e){
                scrollLogTextarea(e.detail.elt);
            }


            function initTracker(){
                if( cbdvr.debug ) console.log("Begin tracking");
                document.body.addEventListener('htmx:sseBeforeMessage', beforeSwapHandler);
                document.body.addEventListener('htmx:afterSwap', afterSwapHandler);
                // Save the channel data onunload
                window.addEventListener("beforeunload", function(){
                    sessionStorage.setItem("channels", JSON.stringify(channels));
                }, false);
                ChannelTracker.onReady(channels);
            }
            
            // Get JSON chInfo from go, before we start
            // This way we have info about all channels, and do not need to wait for "updates" to register channels.
            prefetchChannelData( initTracker ); 

            return {
                getChannel : function( channel_id ){
                    return getChannelObj( channel_id )
                },
                getChannelsData : function(){
                    return channels;
                }                
            }
        })();


         // ================================================================================================


        function trackFilesize(log_txt, ch) {
            // Get the last line and attempt to extract filesize value
            // This is a bit oldschool, but safe.
            let last_line = log_txt.trim().split("\n").pop();
            const s1 = last_line.split("filesize: ");
            if (s1.length < 2) return null;

            const firstValue = s1[1].split(" ")[0];
            const number = !isNaN( firstValue ) ? parseFloat( firstValue ) : 0;
            const kilobytes = Math.round(number * 1024); // Convert to KB
            if(!kilobytes) return
            
            const lastEntry = ch.dataTransferTracking[ch.dataTransferTracking.length - 1];
            
            // Detect filesize reset ( Is file suddently lower? )
            if (lastEntry && kilobytes < lastEntry[0] ) {
                //console.warn("Detected filesize reset. Resetting tracking history.");
                ch.dataTransferTracking = [];
            }

            // Trim to max length
            if (ch.dataTransferTracking.length >= 10) ch.dataTransferTracking.shift();

            // Add new entry
            ch.dataTransferTracking.push([kilobytes, Date.now() ]);

            // Calculate average throughput
            if ( kilobytes && ch.dataTransferTracking.length > 2) {
                const first = ch.dataTransferTracking[0];
                const last = ch.dataTransferTracking[ch.dataTransferTracking.length - 1];
                const deltaKB = last[0] - first[0];
                const deltaSec = (last[1] - first[1]) / 1000;

                if (deltaSec > 0) {
                    const avgThroughputKBps = deltaKB / deltaSec;
                    ch.avgThroughputKBps = avgThroughputKBps;
                }
            }
        }

        function totalThroughput() {
            var channels = ChannelTracker.getChannelsData();
            var total = 0;
            Object.values(channels).forEach(function(ch) {
                if ( ch.status === "RECORDING" && ch.avgThroughputKBps > 0 ) {
                    total += ch.avgThroughputKBps;
                }
            });
            let el = document.querySelector(".mini-badges .throughput");
            el.innerHTML = ( total / 1024 ).toFixed( 2 ) + " MB/s";
        }

        setInterval(totalThroughput,500);


        function updateCounters() {
            const data = ChannelTracker.getChannelsData();
            
            // How many of each?
            const statusCounts = Object.values(data).reduce((acc, entry) => {
                acc[entry.status] = (acc[entry.status] || 0) + 1;
                return acc;
            }, {});

            // Select all badge elements with class starting with 'mini-badge-'
            const badgesElm = document.querySelector(".mini-badges");
            const allBadgeEls = document.querySelectorAll(".mini-badges > div");
            badgesElm.style.opacity = 1;

            allBadgeEls.forEach(el => {
                const match = el.className.match(/mini-badge-(\w+)/i);
                if (!match) return;

                const status = match[1].toUpperCase();
                const count = statusCounts[status];

                if ( count ) {
                    var old = parseInt( el.textContent )
                    var idle_opacity = .7
                    if( count > old) {
                        gsap.fromTo(el,{ opacity: 1, },{ delay:.2, opacity:idle_opacity, duration: 1, ease: "linear" });
                    }else {
                        gsap.fromTo(el,{ opacity: .4, },{ opacity:idle_opacity, duration: 1, ease: "linear" }); 
                    }
                    el.textContent = count;
                    el.style.display = "";                                                              
                } else {
                    el.style.display = "none"; 
                }
                
            });
        }

       

        var UpdateChannelVisuals = (function(){
            // This function updates everything that needs to be updated after a channel changes its status.
            
            // Set status like "ch-status-offline" to channel-box, we let parent CSS rule over child elements; badge and thumbnail 
            var a_status = ["blocked", "offline", "recording", "paused", "queued"];
            function setChannelBoxStatus(channel_box, channel){
                a_status.forEach(status => channel_box.classList.remove( "ch-status-"+status ));
                channel_box.classList.add( "ch-status-"+channel.status.toLowerCase() );
            }
            
            return function ( channel ){
                console.log("channel_id", channel.id)
                var channel_box = getBoxFromChannelName( channel.id );
                channel_box.querySelector(".ch-status").innerHTML = channel.status;
                
                setChannelBoxStatus( channel_box, channel ); // set status class to channel_box
                ListSorter.updateSort(); // Sort list items;
                updateCounters(); // Update counters and throughput
            }
        })();


      
        // ================================================================================================
        
        // DO SOMETHING WHEN STATUS CHANGE TRACKED  

        // This is called everytime a channel changes its status
        ChannelTracker.onStatusUpdate = function( channel , evt ){
            UpdateChannelVisuals( channel, evt );
            if( cbdvr.debug ) console.log("Channel Status Updated: " + channel.id + " ["+channel.status+"]");
        }

        ChannelTracker.onReady = function( channels_data ){
            if( cbdvr.debug ) console.log("Tracker ready", channels_data )
            setTimeout( function() { updateCounters() }, 500);
            
            // Make sure that updated background images ( in this session ) are not being cached    
            Object.values(channels_data).forEach( function( ch ) {
                if (ch.thumbAnticache) makeThumbnailUncached( ch.id, ch.thumbAnticache );
            });
        } 

        ChannelTracker.onRecordingUpdate = function( channel, evt ){
            trackFilesize ( evt.detail.data , channel )
        }  

       
        // ================================================================================================
        
        






        // ─█▀▀█ ░█▀▀█ ▀█▀ 
        // ░█▄▄█ ░█▄▄█ ░█─ 
        // ░█─░█ ░█─── ▄█▄




        function getChannel(username, onData){
            if(!username) return onData ? onData(null) : null;
            fetch('/api/channel/' + encodeURIComponent(username))
                .then(res => res.json())
                .then(data => {
                    if(onData) onData(data)
                })
        }

        function getChannels(onData){
            fetch('/api/channels/')
                .then(res => res.json())
                .then(data => {
                    if(onData) onData(data)
                })
        }
     
        function updateChannelThumbnail(channel_id, onData){
            var elm = getBoxFromChannelName( channel_id );
            if(!elm) return;

            elm.classList.add("loading-thumbnail");
            var success = null;

            fetch( '/update_thumbnail/' + channel_id, { method: 'POST' }).then(function(response) {
                if (response.ok) {
                    success = true;
                } else {
                    console.error("Failed to update thumbnail for:", channel_id);
                }
            }).finally(() => {
                setTimeout( function(){ 
                    if( success === true ) makeThumbnailUncached( channel_id );
                    elm.classList.remove("loading-thumbnail"); 
                }, 500 );
            }); 
        }

        function requestChannelUpdate(channel_id, onData){
            fetch( '/update_channel/' + channel_id, { method: 'POST' }).then(function(response) {
                if (response.ok) {
                    if( cbdvr.debug ) console.log("requestChannelUpdate( " + channel_id+ ")" + " success!")
                } else {
                    console.log("requestChannelUpdate( " + channel_id+ ")" + " error!")
                }
            }); 
        }        

        function pauseChannel(channel_id, onData){
            fetch( '/pause_channel/' + channel_id, { method: 'POST' }).then(function(response) {
                if (!response.ok) console.error("Failed to pause channel:", channel_id);
            }); 
        }

        function resumeChannel(channel_id, onData){
            fetch( '/resume_channel/' + channel_id, { method: 'POST' }).then(function(response) {
                if (!response.ok) console.error("Failed to resume channel:", channel_id);        
            });                
        }    
        // ================================================================================================






        // ░█▀▄▀█ ▀█▀ ░█▀▀▀█ ░█▀▀█ 
        // ░█░█░█ ░█─ ─▀▀▀▄▄ ░█─── 
        // ░█──░█ ▄█▄ ░█▄▄▄█ ░█▄▄█




        // --
        function sseParseEvent(evt){
            // Parse the id 
            // Example: "channel123-info" or "channel123-log"    
                
            var sswe_id     = evt.detail.elt.getAttribute('sse-swap');
            if( !sswe_id ) {
                console.log( "no sse-swap attribute found", evt ) 
                return {}
            } 
            var divider     = sswe_id.lastIndexOf("-");
            var channel_id  = sswe_id.substring(0, divider); // "channel123"
            var log_type    = sswe_id.substring( divider + 1 , sswe_id.length ); // "info" or "log" 
            return ( log_type && channel_id ) ? {channel_id: channel_id,log_type: log_type} : {};
        }
        // --
        function cancelEvent(evt){
            evt.stopPropagation();
            evt.preventDefault();
            return null
        }
        // --
        function getChannelNameFromElement(el) {
            let chEl = el.closest('[channel-id]');
            return chEl ? chEl.getAttribute("channel-id") : "";
        }
        // --
        function getElementFromChannelName( channel_id ){
            return document.querySelector(`[sse-swap="${channel_id}-info"]`);
        }
        // --
        function getBoxFromChannelName( channel_id ){
            return document.querySelector(`[channel-id="${channel_id}"]`);
        }

        function scrollLogTextarea( el ){
            if( el.closest(".js-is-collapsed") ) return null
            var textarea = el.tagName === "TEXTAREA" ? el : el.querySelector("textarea");
            
            // Only scroll if textarea is non collapsed and "Auto Log Update" is enabled
            if( textarea && el.closest(".channel-box").querySelector("[type=checkbox]").checked ) {
                setTimeout( function(){ textarea.scrollTop = textarea.scrollHeight; }, 1 )
            }
        } 


        // -- Get user-agent
        function insertUserAgent(){
            document.querySelector('#settings-dialog textarea[name="user_agent"]').value = navigator.userAgent;
        }

        // -- Manage anticache parameter to update thumbnail
        function makeThumbnailUncached( channel_id , anticacheInt ){
            var ch = ChannelTracker.getChannel( channel_id );
            var elm = getBoxFromChannelName( channel_id );
            try {
                elm.querySelector(".channel-thumbnail").style.backgroundImage = ( "url(./channel-images/" + channel_id + ".jpg?"+ ( anticacheInt || ++ch.thumbAnticache ) +" ), url(static/default_user.png)" );
            }catch(err){}
        }
    
        // ================================================================================================






        // ░█▀▀▄ ░█▀▀▀ ░█▀▀█ ░█─░█ ░█▀▀█ 
        // ░█─░█ ░█▀▀▀ ░█▀▀▄ ░█─░█ ░█─▄▄ 
        // ░█▄▄▀ ░█▄▄▄ ░█▄▄█ ─▀▄▄▀ ░█▄▄█



        (function(){
            const logWindow = document.querySelector("#log-window")
            const topBar = document.querySelector("#log-window .ts-app-topbar")
            let isDragging = false;
            let offsetX, offsetY;

            topBar.addEventListener("mousedown", (e) => {
                isDragging = true;
                offsetX = e.clientX - logWindow.offsetLeft;
                offsetY = e.clientY - logWindow.offsetTop;
            });

            document.addEventListener("mousemove", (e) => {
            if (isDragging) {
                logWindow.style.left = `${e.clientX - offsetX}px`;
                logWindow.style.top = `${e.clientY - offsetY}px`;
            }
            });

            document.addEventListener("mouseup", () => {
            isDragging = false;
            });
        })()


        function enableDebug(e){
            cbdvr.debug = !!cbdvr.debug;
            document.body.classList.toggle("debug");
            //document.getElementById('log-window');
            if(e) cancelEvent(e);
        }

        var debug_out_sse_skipped = 0
        var debug_out_sse_passed = 0
        var elm_debug_out_sse_skipped = document.getElementById("sse-skipped");
        var elm_debug_out_sse_passed = document.getElementById("sse-passed");
        elm_debug_out_sse_skipped.innerHTML = 0
        elm_debug_out_sse_passed.innerHTML = 0   


        function enableSSEDebugging(channel_id){
            cbdvr.debug = true;

            function doDebug(e,){
                let sswe_id     = e.detail.elt.getAttribute('sse-swap')
                if(sswe_id === null || sswe_id === undefined) {
                    console.log("No sse-swap attribute found on element", e.detail.elt);
                } else {
                    var divider     = sswe_id.lastIndexOf("-");
                    var channel_id  = sswe_id.substring(0, divider);
                    var log_type    = sswe_id.substring( divider + 1 , sswe_id.length ); 
                    if( cbdvr.debug ) console.log( "["+log_type+"]" +" "+ channel_id +":"+ e.type, e);
                }

            }

            const events = [
                'htmx:afterSwap', 'htmx:beforeRequest', 'htmx:beforeSwap',
                'htmx:afterRequest', 'htmx:configRequest', 'htmx:beforeOnLoad',
                'htmx:afterOnLoad', 'htmx:beforeSettle', 'htmx:afterSettle',
                'htmx:sseRefresh', 'htmx:sseBeforeMessage', 'htmx:sseAfterMessage',
                'htmx:sseError'
            ];

            events.forEach(event => document.body.addEventListener(event, doDebug));
        }
        // ================================================================================================








        // ░█▀▀▀ ░█▀▀▀█ ░█▀▀█ 　 ░█▀▀█ ░█▀▀▀█ ░█▄─░█ ░█▀▀▀█ ░█▀▀▀█ ░█─── ░█▀▀▀ 
        // ░█▀▀▀ ░█──░█ ░█▄▄▀ 　 ░█─── ░█──░█ ░█░█░█ ─▀▀▀▄▄ ░█──░█ ░█─── ░█▀▀▀ 
        // ░█─── ░█▄▄▄█ ░█─░█ 　 ░█▄▄█ ░█▄▄▄█ ░█──▀█ ░█▄▄▄█ ░█▄▄▄█ ░█▄▄█ ░█▄▄▄
     

        
        function getChannelsCSV(){
            getChannels(function(data){
                var names = data.map(function(ch) { return ch.Username; }).join(',');
                console.log( names )
            })
        } 
        // Export your channels list       
        // call cbdvr.getChannelsCSV() in web console



        function blurForDemo() {
            document.body.classList.toggle("blur-for-demo");
        }  
        // Blur for screenshots 
        // call cbdvr.blurForDemo() in web console

        // ================================================================================================





        // ░█▀▀█ ░█─░█ ░█▀▀█ ░█─── ▀█▀ ░█▀▀█ 　 ░█▀▄▀█ ░█▀▀▀ ▀▀█▀▀ ░█─░█ ░█▀▀▀█ ░█▀▀▄ ░█▀▀▀█ 
        // ░█▄▄█ ░█─░█ ░█▀▀▄ ░█─── ░█─ ░█─── 　 ░█░█░█ ░█▀▀▀ ─░█── ░█▀▀█ ░█──░█ ░█─░█ ─▀▀▀▄▄ 
        // ░█─── ─▀▄▄▀ ░█▄▄█ ░█▄▄█ ▄█▄ ░█▄▄█ 　 ░█──░█ ░█▄▄▄ ─░█── ░█─░█ ░█▄▄▄█ ░█▄▄▀ ░█▄▄▄█
        
        //Global/public object for the app

        window.cbdvr = (function(){
            return {
                initTs: new Date().getTime(),
                editChannel: EditChannelDialog.open,
                sortList: ListSorter.sortNow,
                enableSSEDebugging: enableSSEDebugging,
                enableDebug:enableDebug,
                debug: cbdvr_debug,
                blurForDemo: blurForDemo,
                getChannels: getChannels,
                getChannelsCSV: getChannelsCSV,
                getChannel: getChannel,
                resumeChannel: resumeChannel,
                pauseChannel: pauseChannel,
                confirmChannelDeletion: confirmChannelDeletion,
                updateChannelThumbnail:updateChannelThumbnail,
                insertUserAgent: insertUserAgent,
                getTrackedChannels:function(){ return ChannelTracker.getChannelsData() }
            }
        })()

        // ================================================================================================

    } /* End Of main */ 

})()
