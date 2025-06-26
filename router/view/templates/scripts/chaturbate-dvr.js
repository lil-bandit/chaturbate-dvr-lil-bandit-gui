(function(){

    
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
            let value = e.target.value.trim()
            // Only try to extract channel ID if it looks like a chaturbate URL
            if (value.includes('chaturbate.')) {
                let match = value.match(/^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?chaturbate\.[a-z.]+\/([^\/\s?#]+)/i);
                if (match) {
                    // Replace input with just the username
                    e.target.value = match[1] 
                }
            }
            // Otherwise, leave as-is (for comma-separated IDs)
        });






        // ░█▀▀▀█ ░█▀▀▀█ ░█▀▀█ ▀▀█▀▀ 
        // ─▀▀▀▄▄ ░█──░█ ░█▄▄▀ ─░█── 
        // ░█▄▄▄█ ░█▄▄▄█ ░█─░█ ─░█──



        //-----
        var ListSorter = (function() {
            var lastOrder = [];
            var lastUserMoved = 0;
            var lastAnimationTs = new Date().getTime();
            var timeout_reference;
            
            // Helper to compare two arrays element by element
            function arraysAreEqual(arr1, arr2) {
                if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
                for (var i = 0; i < arr1.length; i++) {
                    if (arr1[i] !== arr2[i]) return false;
                }
                return true;
            }

            function delayedAnim() {
                clearTimeout(timeout_reference);
                timeout_reference = setTimeout(sortRowsCustom, 500);
            }

            function getStatusPriority(el) {
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
        
            function sortRowsCustom() {
                /*
                // Optionally use this if you want to delay the animation due to userinteaction ( mouse move )
                var now = new Date().getTime();
                if ((now - lastUserMoved) < 3000) return delayedAnim();
                */

                var container = document.querySelector('.ts-wrap');
                var boxes = Array.prototype.slice.call(container.querySelectorAll('.ts-box'));

                // Sort the boxes based on status priority and header text
                boxes.sort(function(a, b) {
                    var pa = getStatusPriority(a);
                    var pb = getStatusPriority(b);
                    if (pa !== pb) return pa - pb;
                    var aHeaderEl = a.querySelector('.ts-header');
                    var bHeaderEl = b.querySelector('.ts-header');
                    var aText = aHeaderEl ? aHeaderEl.textContent.trim() : "";
                    var bText = bHeaderEl ? bHeaderEl.textContent.trim() : "";
                    return aText.localeCompare(bText);
                });

                // Build the new order array of header texts
                var newOrder = boxes.map(function(box) {
                    var headerEl = box.querySelector('.ts-header');
                    return headerEl ? headerEl.textContent.trim() : "";
                });
                
                // If the order hasn't changed, skip reordering and animation
                if (arraysAreEqual(newOrder, lastOrder)) {
                    return;
                }

                // Store initial positions
                var positions = new Map();
                boxes.forEach(function(box) {
                    positions.set(box, box.getBoundingClientRect());
                });

                // Append in new order to the container
                boxes.forEach(function(box) {
                    container.appendChild(box);
                });

                // Animate movement using gsap
                boxes.forEach(function(box) {
                    var oldPos = positions.get(box);
                    var newPos = box.getBoundingClientRect();
                    var textarea = box.closest(".js-is-collapsed") ? null : box.querySelector("textarea");
                    var deltaX = oldPos.left - newPos.left;
                    var deltaY = oldPos.top - newPos.top;

                    var dObj = { x: 0, y: 0, duration: 0.7, ease: "power2.out" }

                    // Scroll non collapsed texareas
                    if( textarea ) {
                        dObj.onUpdate = function() {
                            if ( textarea ) scrollLogTextarea( textarea )
                        }
                    }    
                    gsap.fromTo( box, { x: deltaX, y: deltaY }, dObj);
                });

                // Update lastOrder to the new order for next time
                lastOrder = newOrder;
            }

            // Listen to mouse movements (this was used before for potential delays)
            document.body.addEventListener('mousemove', function(e) {
                lastUserMoved = new Date().getTime();
            });

            return {
                sortNow: function() {
                    delayedAnim() // if you prefer using the delayed version
                    //sortRowsCustom();
                }
            };
        })();


       

        


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
                setTimeout(function(){ textarea.style.overflowY = "auto";}, 450);

                // Make sure the logarea has text ( DOM updates are cancelled while collapsed )
                setTimeout( function () { requestChannelUpdate(channel_id) },400); 
            } else {
                console.error('No parent .channel-box found for the clicked element.')
            }
            return cancelEvent(event);
        }






        // ░█▀▀█ ░█─── ▀█▀ ░█▀▀█ ░█─▄▀ ░█▀▀▀█ 
        // ░█─── ░█─── ░█─ ░█─── ░█▀▄─ ─▀▀▀▄▄ 
        // ░█▄▄█ ░█▄▄█ ▄█▄ ░█▄▄█ ░█─░█ ░█▄▄▄█


 
        var ClickHandler = (function(){
            
            // Gotta Catch 'Em All! 🦖🎵🎶

            function clickHandler(event) {
                var channel_id = getChannelNameFromElement(event.target);
                //console.log( "channel_id " + channel_id )
                
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
                    event.target.closest('.paused') ? resumeChannel( channel_id ) : pauseChannel( channel_id );
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
                    return cancelEvent(event);
                }else if ( event.target.closest(".menu-enable-debug") ) {
                    cbdvr.enableDebug(event);
                    return cancelEvent(event);
                }                

                // EXPAND/COLLAPSE LIST ITEM
                if( event.target.closest('.channel-header') ) {
                    onCollapsibleClick(event);
                }     

            };

            document.body.addEventListener('click', clickHandler); 
        })()







        // ▀▀█▀▀ ░█▀▀█ ─█▀▀█ ░█▀▀█ ░█─▄▀ 
        // ─░█── ░█▄▄▀ ░█▄▄█ ░█─── ░█▀▄─ 
        // ─░█── ░█─░█ ░█─░█ ░█▄▄█ ░█─░█


        //-----

        var ChannelTracker = (function (){
            var channel_data = {};

            const status_strings = ["OFFLINE","QUEUED","BLOCKED","PAUSED","RECORDING"];
            
            function getStatusFromData(str) {
                str = str.toUpperCase();
                return status_strings.find(status => str.includes(status)) || null;
            }        
             
            function getChannelObj( channel_id ){
                channel_data[channel_id] = channel_data[channel_id] || {
                    id: channel_id,
                    lastInfoUpdateTs: Date.now(),
                    lastLogUpdateTs: Date.now(),
                    lastUpdateTs: Date.now(),
                    status: null
                }; // Create if not exist
                return channel_data[channel_id];
            }

            function inspectEvent(e) {
                const now = Date.now();
                const sseInfo = sseParseEvent(e);
                if (!sseInfo.channel_id) return console.log("channel_id was nothing");

                const ch = getChannelObj( sseInfo.channel_id );
                ch.lastUpdateTs = now;
                if (sseInfo.log_type === "info") {
                    ch.lastInfoUpdateTs = now;
                    const status = getStatusFromData( e.detail.data );
                    if ( status && ch.status !== status ) {
                        ch.status = status;
                        ChannelTracker.onUpdate(sseInfo.channel_id, status, ch);
                    }
                } else if (sseInfo.log_type === "log") {
                    ch.lastLogUpdateTs = now;
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

            document.body.addEventListener('htmx:sseBeforeMessage', beforeSwapHandler);
            document.body.addEventListener('htmx:afterSwap', afterSwapHandler);
            
             return {
                getChannel : function( channel_id ){
                    return getChannelObj( channel_id )
                }
            }
        })();


        var setStatusBadge = (function(){
            // class names
            var a_status = ["blocked", "offline", "recording", "paused", "queued"];
            
            function setStatusBadge(channel_id, status_txt){
                try {
                    var el = document.body.querySelector(".ts-box." + channel_id + " .ch-status");
                    if (el) {
                        // Remove all possible status classes
                        a_status.forEach(function(status){
                            el.classList.remove(status.toLowerCase());
                        });
                        // Update content and add new status class
                        el.innerHTML = status_txt;
                        el.classList.add(status_txt.toLowerCase());
                    } 
                } catch(err) {
                    // Optionally log or handle the error
                }
            }
            return setStatusBadge;
        })();


        // This is called everytime a channel shanges status
        ChannelTracker.onUpdate = function( channel_id, status_txt ){
            setStatusBadge(channel_id, status_txt);
            ListSorter.sortNow();
            if( cbdvr.debug ) console.log("Channel Status Updated: " + channel_id + " ["+status_txt+"]");
        }






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
            fetch( '/update_thumbnail/' + channel_id, { method: 'POST' }).then(function(response) {
                if (response.ok) {
                    var elm = getChannelListElementFromName( channel_id )
                    console.log("channel_id: " + channel_id, elm)
                    
                    elm.classList.add("loading-thumbnail")
                    setTimeout(function(){ window.location.reload(true); },3000);
                } else {
                    console.error("Failed to pause channel:", channel_id);
                }
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







        // ░█▀▄▀█ ▀█▀ ░█▀▀▀█ ░█▀▀█ 
        // ░█░█░█ ░█─ ─▀▀▀▄▄ ░█─── 
        // ░█──░█ ▄█▄ ░█▄▄▄█ ░█▄▄█



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

        function cancelEvent(evt){
            evt.stopPropagation();
            evt.preventDefault();
            return null
        }
      
        function getChannelNameFromElement(el) {
            try {
                return el.closest('[channel-id]').getAttribute("channel-id");
            }catch(err) {}
            return null;
        }

        function getElementFromChannelName( channel_id ){
            return document.querySelector(`[sse-swap="${channel_id}-info"]`);
        }

        function getChannelListElementFromName( channel_id ){
            return document.querySelector(`[channel-id="${channel_id}"]`);
        }

        function scrollLogTextarea( el ){
            if( el.closest(".js-is-collapsed") ) return null
            var textarea = el.tagName === "TEXTAREA" ? el : el.querySelector("textarea")
            
            // Only scroll if textarea is non collapsed and "Auto Log Update" is enabled
            if( textarea && el.closest(".channel-box").querySelector("[type=checkbox]").checked ) {
                setTimeout( function(){ textarea.scrollTop = textarea.scrollHeight; }, 1 )
            }
        }


        function insertUserAgent(){
            document.querySelector('#settings-dialog textarea[name="user_agent"]').value = navigator.userAgent;
        }


   






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
                debug: false,
                blurForDemo: blurForDemo,
                getChannels: getChannels,
                getChannelsCSV: getChannelsCSV,
                getChannel: getChannel,
                resumeChannel: resumeChannel,
                pauseChannel: pauseChannel,
                confirmChannelDeletion: confirmChannelDeletion,
                updateChannelThumbnail:updateChannelThumbnail,
                insertUserAgent: insertUserAgent,
            }
        })()


    } /* End Of main */ 

})()
