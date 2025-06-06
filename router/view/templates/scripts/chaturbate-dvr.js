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
                if( !channel_id ) return null
                switch( el.textContent.trim() ) {
                    case "RECORDING":
                        console.log("RECORDING")
                        fetch('/pause_channel/'+channel_id, { method: 'POST' })
                        break;
                    case "PAUSED":
                        console.log("PAUSED")
                        fetch('/resume_channel/'+channel_id, { method: 'POST' })
                        break;
                    case "OFFLINE":
                        console.log("OFFLINE")
                        fetch('/pause_channel/'+channel_id, { method: 'POST' })
                        break;
                }
            }


            function onClickCollapsibleEvent(event) {
                let collapseClass = "js-is-collapsed"
                const box = event.target.closest('.ts-box')
                if (box) {
                    if (box.classList.contains(collapseClass)) {
                        box.classList.remove(collapseClass);
                        window.htmx.trigger(document.body, 'htmx:sseRefresh');
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

                        // Set edit flag
                        document.getElementById('edit-flag').value = "true";

                        // Fill fields 
                        with( document.getElementById('username-input') ) {
                            value  = data.Username || "";
                            blur();
                            with(style) {
                                 pointerEvents = "none"; // Disable pointer events
                                opacity = "0.5"; // Make it look disabled
                            }
                        }
                     
/*
                        document.getElementById('username-input').value             = data.Username     || "";
                        //document.getElementById('username-input').disabled          = true;
                        with ( document.getElementById('username-input').style ) {
                            pointerEvents = "none"; // Disable pointer events
                            opacity = "0.5"; // Make it look disabled
                        } 
*/
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
                        
                        document.getElementById("myForm").addEventListener("submit", onSubmit);

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









        // Channel Tracker
        function ChannelTracker( onUpdate ){
            // Run once on load
            onUpdate = typeof(onUpdate) === "function" ? onUpdate : function(){};
            var channel_data = {};

            // Update object accordingly
            document.body.addEventListener('htmx:afterSwap', function(e) {
                let sswe_id = e.detail.elt.getAttribute('sse-swap')
                if (sswe_id && sswe_id.endsWith("-info") ) {
                    var splt = e.detail.elt.innerText.split("\n")
                    if(splt.length > 1) {
                        var channel_id = splt[0].trim();
                        var status = splt[1].trim();
                        if( channel_data[channel_id] !== status ) {
                            channel_data[channel_id] = status;
                            onUpdate(channel_id,status);
                        }
                    }
                }
            });
        }








        //-----
        var ListSorter = (function(){

            let lastOrder = [];
            var lastUserMoved = 0;
            
            function getStatusPriority(el) {
                const badgeText = el.querySelector('.ts-badge')?.textContent.trim() || '';
                if (badgeText === 'RECORDING')  return 0;
                if (badgeText === 'QUEUED')     return 1;
                if (badgeText === 'PAUSED')     return 2;
                if (badgeText === 'OFFLINE')    return 3;
                return 4;
            }
            
            function sortRowsCustom() {
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
                        { x: 0, y: 0, duration: 0.5, delay:1, ease: "power2.out" }
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
                    sortRowsCustom()
                }
            }
        })()
        //-----







        function insertUserAgent(){
            document.querySelector('#settings-dialog textarea[name="user_agent"]').value = navigator.userAgent;
        }






        //Global object for the app
        window.cbdvr = (function(){
            return {
                EditChannelDialog: EditChannelDialog,
                sortList: ListSorter.sortNow,
                ChannelTracker: ChannelTracker,
                insertUserAgent: insertUserAgent
            }
        })()
    
    

        // Start tracking channels
        ChannelTracker( function(channel, status){
            ListSorter.sortNow();
            console.log("Channel Status Updated: " + channel + " ["+status+"]")
        })
    


    } /* End Of main */ 



})()
