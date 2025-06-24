(function(){
   
    
    
    
    document.addEventListener("DOMContentLoaded", Main, false);
    
    
    function Main(){
        //console.log("Chaturbate DVR Script Loaded")
        
            
        // Common

        function sseParseEvent(evt){
            // Parse the id
            // Example: "channel123-info" or "channel123-log"            
            var sswe_id     = evt.detail.elt.getAttribute('sse-swap');
            var divider     = sswe_id.lastIndexOf("-");
            var channel_id  = sswe_id.substring(0, divider); // "channel123"
            var log_type    = sswe_id.substring( divider + 1 , sswe_id.length ); // "info" or "log" 
            return ( log_type && channel_id ) ? {channel_id: channel_id,log_type: log_type} : {};
            
        }

        function getChannelNameFromElement(el) {
            // Try to find the closest ancestor (or self) with sse-swap
            let parent = el.closest('[sse-swap]');
            let target = parent || el.querySelector('[sse-swap]');
            if (target) {
                let attrValue = target.getAttribute("sse-swap");
                if (attrValue && attrValue.lastIndexOf("-") !== -1) {
                    return attrValue.substring(0, attrValue.lastIndexOf("-"));
                }
            }
            return null;
        }

        function getElementFromChannelName(channel_id){
            return document.querySelector(`[sse-swap="${channel_id}-info"]`);
        }




        // Minimize DOM updates

        document.body.addEventListener("htmx:sseBeforeMessage", function (e) {
   
            var sseInfo = sseParseEvent(e);
                           
            if ( sseInfo.log_type === "log" ) {
                // Only filter "log"
                if ( !e.detail.elt.closest(".ts-box").querySelector("[type=checkbox]").checked ) {
                    e.preventDefault();
                }else {
                   
                    if ( e.detail.elt.closest(".js-is-collapsed") ) {
                        // If the info box is collapsed, prevent the log update
                        e.preventDefault() 
                    }else {
                        /*
                        Moved this logic to "sseAfterMessage" Event handler
                        setTimeout(() => {
                            let textarea = e.detail.elt.closest(".ts-box").querySelector("textarea")
                            textarea.scrollTop = textarea.scrollHeight
                        }, 10)
                        */
                    }
                }
            }
        })
        






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










        // Collapsible items
        var ClickHandler = (function(){

            function onCollapsibleClick(event) {
                let collapseClass = "js-is-collapsed"
                const box = event.target.closest('.ts-box')
                if (box) {
                    if (box.classList.contains(collapseClass)) {
                        box.classList.remove(collapseClass);
                        var channel_id = getChannelNameFromElement(box);
                        
                        // Trigger a refresh of the channel info to update the log textarea
                        setTimeout( function(){
                            //console.log("Requesting update for: " + channel_id)
                            fetch('/update_channel/' + channel_id, { method: 'POST' });
                        },1);

                        let textarea = event.target.closest(".ts-box").querySelector("textarea")
                        textarea.scrollTop = textarea.scrollHeight                        
                    } else {
                        box.classList.add(collapseClass);
                    }
                } else {
                    console.error('No parent .ts-box found for the clicked element.')
                }
            
                event.stopPropagation()
            }


            function handler(event) {
                // This is instead of dealing with click handlers on each element
                const target = event.target;
                const box = event.target.closest('.ts-box')
                                
                if( ( target.classList.contains('ts-header') ) ) {
                    if( target.closest('.ts-box.is-horizontal > div[sse-swap]') ) {
                       
                        onCollapsibleClick(event);
                        return; // Exit early if we handled the click
                    }
                }else if( target.classList.contains('ts-badge') ) {
                    // Handle badge click
                    //onBadgeClick(target);
                    return; // Exit early if we handled the click
                }else if( target.classList.contains('ts-image') && target.classList.contains('is-online') ) {
                    let username = getChannelNameFromElement(box);
                    
                    //console.log( box.querySelector(".channel-thumbnail").style.backgroundImage )
                    //getElementFromChannelName
                    console.log(username)
                    updateChannelThumbnail( username )
                } 
            };

            // Instead of click (more responsive with SSE DOM updates, clicks are not lost)
            document.body.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'touch' || e.pointerType === 'mouse') handler(e);
            }); 

        })()





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
                        document.querySelector('input[name="max_filesize"]').value  = data.MaxFilesize  || 0;
                        document.querySelector('input[name="max_duration"]').value  = timeStringToMinutes(data.MaxDuration);
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
                // Optionally use this if you want to delay the animation
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
                    var deltaX = oldPos.left - newPos.left;
                    var deltaY = oldPos.top - newPos.top;

                    gsap.fromTo(
                        box,
                        { x: deltaX, y: deltaY },
                        { x: 0, y: 0, duration: 0.7, ease: "power2.out" }
                    );
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



        //-----

        function ChannelTracker( onUpdate ){
            // Run once on load
            // We mainly use this to loosely detect if a channel has changed
            // For now, this is mainly for minimizing animation calls.

            onUpdate = typeof(onUpdate) === "function" ? onUpdate : function(){};
            var channel_data = {};

            function getChannelObj( channel_id ){
                channel_data[channel_id] = channel_data[channel_id] || {
                    id: channel_id,
                    lastInfoUpdate: new Date().getTime(),
                    lastLogUpdate: new Date().getTime(),
                    blocked: null,
                    status: null
                }; // Create if not exist

                return channel_data[channel_id];
            }

            function inspectEvent(e){ 
                var now = new Date().getTime();
                var sseInfo = sseParseEvent(e);
                var ch = getChannelObj( sseInfo.channel_id );

                if( sseInfo.log_type === "info" ) {
                    ch.lastInfoUpdate = now;
                    var txt_badge_status = e.detail.elt.querySelector(".ts-badge").textContent.trim();
                    if( txt_badge_status && ( ch.status !== txt_badge_status ) ) {
                        ch.status = txt_badge_status;
                        onUpdate( sseInfo.channel_id, ch.status, ch );
                    }
                }else if( sseInfo.log_type === "log" ){
                    ch.lastLogUpdate = now;
                }

               if( !e.detail.elt.closest(".js-is-collapsed") ) {
                    let textarea = e.detail.elt.closest(".ts-box").querySelector("textarea")
                    textarea.scrollTop = textarea.scrollHeight;
               }
            }

            function healthCheck(){
                var nowDate = new Date();
                var now = nowDate.getTime();
                for (var channel_id in channel_data) {
                    if ( channel_data.hasOwnProperty(channel_id) ) {
                        var ch = channel_data[channel_id];

                        if ( ch.status === "RECORDING" && ch.lastInfoUpdate && (now - ch.lastInfoUpdate > 20000 )) {
                            // Reload the page if the last update of a, supposedly recording, channel was more than 20 seconds ago ( That's too long for a recording to be inactive )
                            console.log(nowDate + " reloading page for channel: " + ch.id);
                            location.reload(); // Reload the page to update the status

                        }else if ( ch.status !== "PAUSED" && ch.lastLogUpdate && (now - Math.max(ch.lastLogUpdate, ch.lastInfoUpdate) > 600000 )) {
                            // If the last log update was more than 10 minutes ago, reload the page
                            console.log(nowDate + " reloading page for channel: " + ch.id);
                            location.reload(); // Reload the page to update the status
                        }
                    }
                }
            }

            document.body.addEventListener('htmx:afterSwap', inspectEvent);
            
            setInterval(healthCheck, 10000); // Check every 10 seconds
        }


        function insertUserAgent(){
            document.querySelector('#settings-dialog textarea[name="user_agent"]').value = navigator.userAgent;
        }


        function getChannel(username, onData){
            if(!username) return onData ? onData(null) : null;
            fetch('/api/channel/:' + encodeURIComponent(username))
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
                    console.log("channel_id: " + channel_id)
                    
                    var elm = getElementFromChannelName(channel_id)
                    elm.parentElement.classList.add("loading-thumbnail")
                    //elm.querySelector('.channel-thumbnail').style.backgroundImage = "url('./channel-images/" + channel_id + ".jpg?"+ new Date().getTime() +"'), url('static/default_user.png')";
                    

                     setTimeout(function(){
                        window.location.reload(true);
                     },3000)
                } else {
                    console.error("Failed to pause channel:", channel_id);
                }
            }); 
        }

        function pauseChannel(channel_id, onData){
            fetch( '/pause_channel/' + channel_id, { method: 'POST' }).then(function(response) {
                if (response.ok) {

                } else {
                    console.error("Failed to pause channel:", channel_id);
                }
            }); 
        }

        function resumeChannel(channel_id, onData){
            fetch( '/resume_channel/' + channel_id, { method: 'POST' }).then(function(response) {
                if (response.ok) {

                } else {
                    console.error("Failed to resume channel:", channel_id);
                }
            });                
        }       

        function confirmChannelDeletion (channel_id) {
            console.log(channel_id)
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
        

        function blurForDemo() {
            document.body.classList.toggle("blur-for-demo");
        }       

        // Start tracking channels
        ChannelTracker( function(channel, status){
            ListSorter.sortNow();
            if( cbdvr.debug ) console.log("Channel Status Updated: " + channel + " ["+status+"]")
        })


        //Global/public object for the app

        window.cbdvr = (function(){
            return {
                initTs: new Date().getTime(),
                editChannel: EditChannelDialog.open,
                sortList: ListSorter.sortNow,
                enableSSEDebugging: enableSSEDebugging,
                debug: false,
                blurForDemo: blurForDemo,
                getChannels: getChannels,
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
