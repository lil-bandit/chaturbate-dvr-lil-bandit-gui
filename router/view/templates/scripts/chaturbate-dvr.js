(function(){
   
    
    
    
    document.addEventListener("DOMContentLoaded", Main, false);
    
    
    function Main(){
        //console.log("Chaturbate DVR Script Loaded")
        
            
        
        document.body.addEventListener("htmx:sseBeforeMessage", function (e) {
            // stop it if "auto-update" was unchecked
            //console.log("htmx:sseBeforeMessage", e)
            let sswe_id = e.detail.elt.getAttribute('sse-swap')
            if (sswe_id && sswe_id.endsWith("-log") ) {
                if (!e.detail.elt.closest(".ts-box").querySelector("[type=checkbox]").checked) {
                    e.preventDefault()
                    return
                }
            }
            // else scroll the textarea to bottom with async trick
            setTimeout(() => {
                let textarea = e.detail.elt.closest(".ts-box").querySelector("textarea")
                textarea.scrollTop = textarea.scrollHeight
            }, 0)
        })

        document.body.querySelectorAll("textarea").forEach((textarea) => {
            textarea.scrollTop = textarea.scrollHeight
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

            function onBadgeClick(el){
                var parent = el.closest("[sse-swap]");
                var channel_id = null
                if ( parent ) {
                    let attrValue = parent.getAttribute("sse-swap");
                    channel_id = attrValue.substring(0, attrValue.lastIndexOf("-"));
                } else {
                    //console.log("No parent with 'sse-swap' found.");
                }
                if( !channel_id || !el.textContent ) return null
                
                fetch( ( el.textContent.trim() === "PAUSED" ? '/resume_channel/' : '/pause_channel/' ) + channel_id, { method: 'POST' });
            }


            function onClickCollapsibleEvent(event) {
                let collapseClass = "js-is-collapsed"
                const box = event.target.closest('.ts-box')
                if (box) {
                    if (box.classList.contains(collapseClass)) {
                        box.classList.remove(collapseClass);
                        //window.htmx.trigger(document.body, 'htmx:sseRefresh');
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

            document.body.addEventListener("click", function(event) {
                // This is instead of dealing with click handlers to each element
                const target = event.target;
                if( ( target.classList.contains('ts-header') || target.classList.contains('ts-image') ) ) {
                    if( target.closest('.ts-box.is-horizontal > div[sse-swap]') ) {
                        //console.log("Clicked on a collapsed header or image, toggling collapse state.");
                        onClickCollapsibleEvent(event);
                        return; // Exit early if we handled the click
                    }
                }else if( target.classList.contains('ts-badge') ) {
                    // Handle badge click
                    onBadgeClick(target);
                    return; // Exit early if we handled the click
                }
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
                document.getElementById("myForm").removeEventListener("submit", onSubmit);
            }  
            

            function onSubmit(e) {
                   document.getElementById('username-input').disabled = false; 
            }

            function open(btn) {
                
                const username = btn.getAttribute('data-username');

                fetch('/api/channel/' + encodeURIComponent(username))
                    .then(res => res.json())
                    .then(data => {
                        console.log("------------->>> YESSS")
                        // Set edit flag
                        document.getElementById('edit-flag').value = "true";

                        // Fill userfield and disable it
                        // This is a workaround to disable the input field visually, or the value wont be submitted
                        with( document.getElementById('username-input') ) {
                            value  = data.Username || "";
                            onfocus = function() { this.blur(); } // Disable focus
                            tabindex="-1"
                            blur();
                            with(style) {
                                pointerEvents = "none"; // Disable pointer events
                                opacity = "0.5"; // Make it look disabled
                            }
                        }
                        // Fill fields
                        document.querySelector('select[name="resolution"]').value   = data.Resolution   || 1080
                        document.querySelector('input[name="priority"]').value      = data.Priority     || 0
                        document.querySelector('input[name="max_filesize"]').value  = data.MaxFilesize  || 0;
                        document.querySelector('input[name="max_duration"]').value  = data.MaxDuration  || 0;
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









        // Channel Tracker - to keep track of updates and kickstart if buggy errors

        function ChannelTracker( onUpdate ){
            // Run once on load
            onUpdate = typeof(onUpdate) === "function" ? onUpdate : function(){};
            var channel_data = {};


            function getChannelObj( channel_id ){
                var d = channel_data;
                var i = channel_id;
                d[i] = d[i] || {
                    id:i,
                    lastInfoUpdate: new Date().getTime(),
                    lastLogUpdate: new Date().getTime(),
                    blocked: null,
                    status: null
                }; // Create if not exist
                return d[i];
            }

            function setBlockedStatus( ch ){
                console.log("Channel:", ch)
       
                var delay = function() {
                    var el = document.body.querySelector("[sse-swap='" + ch.id + "-info'] .ts-badge")
                    if( el ) {
                         
                        if( ch.blocked ) {
                            el.classList.add("blocked_badge");
                            el.textContent = "BLOCKED"
                        }else {
                            el.classList.remove("blocked_badge");
                            el.textContent = ch.status || "OFFLINE"
                        }

                    }else {
                        console.log("setBlockedStatus : no element found for channel_id", ch.id);
                    }
                }
                setTimeout(delay,50);
            }


            function inspectEvent(e){

                var now = new Date().getTime();

                // Grab the id
                let sswe_id     = e.detail.elt.getAttribute('sse-swap')
                if(sswe_id === null || sswe_id === undefined) {
                    if( cbdvr.debug ) console.log("No sse-swap attribute found on element", e.detail.elt);
                    return; // Exit if no sse-swap attribute found
                } 
                
                var divider     = sswe_id.lastIndexOf("-");
                var channel_id  = sswe_id.substring(0, divider);
                var log_type    = sswe_id.substring( divider + 1 , sswe_id.length ); 
                
                if( cbdvr.debug ) console.log( "["+log_type+"]" +" "+ channel_id +":"+ e.type, e);
                            
                if(channel_id === null || channel_id === undefined) return cbdvr.debug ? console.log( "Hmmm -----> No channel_id found in sse-swap attribute", e.detail.elt ) : null;
              


                var ch = getChannelObj( channel_id );

                if( log_type === "info" ) {
                    ch.lastInfoUpdate = now;
                    
                    // We parse the HTML to get the status
                    // We assume the first line is the channel name and the second line is the status
                    var splt = e.detail.elt.innerText.split("\n");
                    var txt_status = splt.length > 1 ? splt[1].trim() : "";
                    if( ch.status !== txt_status ) {
                        ch.status = txt_status;
                        if( ch.blocked ) setBlockedStatus( ch );
                        onUpdate( channel_id, txt_status, ch );
                    }
                }else if( log_type === "log" ){
                    ch.lastLogUpdate = now;
                    
                    // We parse the HTML to get the last line of the log
                    let lines = e.detail.elt.innerText.split("\n");
                    let lastLine = lines.length > 0 ? lines[lines.length - 1].trim() : "";
                    var isBlocked = ( lastLine.indexOf("Cloudflare") > -1 );
                    if( isBlocked !== ch.blocked ) {
                        ch.blocked = isBlocked
                        setBlockedStatus( ch )
                    }
                              
                }

                if( ch.emergencyResumeFunc ) {
                    ch.emergencyResumeFunc();
                }

            }
  
            

            function checker(){
                var now = new Date().getTime();
                for (var channel_id in channel_data) {
                    if ( channel_data.hasOwnProperty(channel_id) ) {
                        var ch = channel_data[channel_id];
                        
                        if ( ch.status === "RECORDING" && ch.lastInfoUpdate && (now - ch.lastInfoUpdate > 10000 )) {
                            // Reload the page if the last update was more than 10 seconds ago ( That's too long for a recording to be inactive )
                            //location.reload(); // Reload the page to update the status
                            
                            restartChannel( ch )
                        }else if ( ch.status !== "PAUSED" && ch.lastLogUpdate && (now - Math.max(ch.lastLogUpdate, ch.lastInfoUpdate) > 240000 )) {
                            
                            // If the last log update was more than 4 minutes ago, reload the page
                            //location.reload(); // Reload the page to update the status
                            
                            restartChannel( ch )
                        }
                    }
                }
            }

            document.body.addEventListener('htmx:afterSwap', inspectEvent);
            setInterval(checker, 5000); // Check every 5 seconds

        }



        function restartChannel( ch ){
            console.log("Restarting channel: " + ch.id )

            ch.emergencyResumeFunc = function(){
                fetch( '/resume_channel/' + ch.id, { method: 'POST' }); 
                delete this.emergencyResumeFunc;
            }
            fetch( '/pause_channel/' + ch.id, { method: 'POST' }); 
        }





        //-----
        var ListSorter = (function(){
            
            let lastOrder = [];
            var lastUserMoved = 0;
            var lastAnimationTs = new Date().getTime();
            var timeout_reference
            
            function delayedAnim(){
                clearTimeout(timeout_reference);
                timeout_reference = setTimeout( sortRowsCustom, 500 );
            }

            function getStatusPriority(el) {
                const badgeText = el.querySelector('.ts-badge')?.textContent.trim() || '';
                if (badgeText === 'RECORDING')  return 0;
                if (badgeText === 'QUEUED')     return 1;
                if (badgeText === 'PAUSED')     return 2;
                if (badgeText === 'BLOCKED')    return 3;
                if (badgeText === 'OFFLINE')    return 4;
                return 5;
            }
            
            function sortRowsCustom() {
                /*
                var now = new Date().getTime();
                if( ( now - lastAnimationTs ) < 1000 ) return delayedAnim();
                
                lastAnimationTs = now;
                */
                const container = document.querySelector('.ts-wrap');
                const boxes = Array.from(container.querySelectorAll('.ts-box'));

                // Store initial positions
                const positions = new Map();
                boxes.forEach(box => positions.set(box, box.getBoundingClientRect()));

                // Sort elements
                boxes.sort((a, b) => {
                    const pa = getStatusPriority(a);
                    const pb = getStatusPriority(b);
                    if (pa !== pb) return pa - pb;
                    return a.querySelector('.ts-header')?.textContent.trim()
                        .localeCompare(b.querySelector('.ts-header')?.textContent.trim());
                });

                // Append in new order
                boxes.forEach(box => container.appendChild(box));

                // Animate movement
                boxes.forEach(box => {
                    const oldPos = positions.get(box);
                    const newPos = box.getBoundingClientRect();
                    const deltaX = oldPos.left - newPos.left;
                    const deltaY = oldPos.top - newPos.top;

                    gsap.fromTo(box, 
                        { x: deltaX, y: deltaY }, 
                        { x: 0, y: 0, duration: 0.7, delay:.05, ease: "power2.out" }
                    );
                });

                lastOrder = boxes.map(box => box.querySelector('.ts-header')?.textContent.trim());
            }

            /* End of ListSorter*/
            document.body.addEventListener('mousemove', function(e) {
                lastUserMoved = new Date().getTime();
            })
            return {
                sortNow: function(){
                    //delayedAnim()
                    sortRowsCustom()
                }
            }
        })()
        //-----



        function getChannel(username, onData){
            
            fetch('/api/channel/:' + encodeURIComponent(username))
                .then(res => res.json())
                .then(data => {
                    onData(data)
                })
        }

        function getChannels(onData){
            
            fetch('/api/channels/')
                .then(res => res.json())
                .then(data => {
                    onData(data)
                })
        }

        function insertUserAgent(){
            document.querySelector('#settings-dialog textarea[name="user_agent"]').value = navigator.userAgent;
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
        





        var CookieManager = (function () {
            function setCookie(name, value, days) {
                var expires = new Date();
                expires.setDate(expires.getDate() + ( days || 9999 ));
                document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + "; expires=" + expires.toUTCString() + "; path=/";
            }

            function getCookie(name) {
                var cookies = document.cookie.split("; ");
                for (var i = 0; i < cookies.length; i++) {
                    var cookieParts = cookies[i].split("=");
                    if (cookieParts[0] === name) {
                        try {
                            return JSON.parse(decodeURIComponent(cookieParts[1]));
                        } catch (e) {
                            return null; // Prevent errors if parsing fails
                        }
                    }
                }
                return null;
            }

            function deleteCookie(name) {
                document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
            }

            function deleteAllCookies() {
                var cookies = document.cookie.split("; ");
                for (var i = 0; i < cookies.length; i++) {
                    var cookieParts = cookies[i].split("=");
                    document.cookie = cookieParts[0] + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
                }
            }

            return {
                SetCookie: setCookie,
                GetCookie: getCookie,
                DeleteCookie: deleteCookie,
                DeleteAllCookies: deleteAllCookies
            };
        })();        

        function getActiveFiles(onComplete, divider) {
            var a = [];
            
            getChannels(function(channels) {
                if (!Array.isArray(channels)) {
                    console.error("getChannels did not return a valid array.");
                    return;
                }
                
                channels.forEach(function(ch) {
                    if (ch && ch.IsOnline && ch.Filename) {
                        a.push(ch.Filename);
                    }
                });
                
                if (typeof onComplete === "function") {
                    onComplete(a.join(divider || "\r\n"));
                }
            });
        }

        function blurForDemo() {
            // Blur thumbnails and channel-header when taking screenshots
            document.body.querySelectorAll(".js-username-title").forEach(function(el) {
                el.style.filter = "blur(3px)";
            });
            document.body.querySelectorAll(".channel-thumbnail").forEach(function(el) {
                el.style.filter = "blur(3px)";
            });
        }


        

        //Global object for the app
        window.cbdvr = (function(){
            return {
                EditChannelDialog: EditChannelDialog,
                sortList: ListSorter.sortNow,
                ChannelTracker: ChannelTracker,
                insertUserAgent: insertUserAgent,
                enableSSEDebugging: enableSSEDebugging,
                debug: false,
                blurForDemo: blurForDemo,
                getChannels: getChannels,
                getChannel: getChannel,
                getActiveFiles: getActiveFiles,
            }
        })()
    
    

        // Start tracking channels
        ChannelTracker( function(channel, status){
            ListSorter.sortNow();
            //if( cbdvr.debug )
                console.log("Channel Status Updated: " + channel + " ["+status+"]")
        })
    


    } /* End Of main */ 



})()
