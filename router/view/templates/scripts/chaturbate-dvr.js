

(function() {
    'use strict';
//--App.js ============================================================================
    // Configuration and state
     const config = {
        debug: new URLSearchParams(window.location.search).has("debug"),
        animationTime: 1700,
        statusOrder: ['RECORDING', 'QUEUED', 'BLOCKED', 'OFFLINE', 'PAUSED']
    };

   
    /*const state = JSON.parse( sessionStorage.getItem("state") || 0 ) || {
        fatalAppError: false,
        appInitData: {},
        UiUnixMs: Date.now(),
        debugCounters: { skipped: 0, passed: 0 }
    };*/
    const state = {
        fatalAppError: false,
        appInitData: {},
        UiUnixMs: Date.now(),
        debugCounters: { skipped: 0, passed: 0 }
    };

  
    const App = {
        async init(){
            App.serverMonitor = new ServerMonitor()
            App.channelView = new ChannelView();
            App.ui = new UI();            
            utils.log(":: Initializing Chaturbate DVR Script (Page load)");
            utils.log("===========================================");

            
            // Inline JSON data in page, served from go
            state.appInitData = JSON.parse( document.getElementById('json-app-data')?.textContent.trim() || {} )
            state.timeOffset = state.appInitData.WebInitUnixMs-Date.now();
            
            // Init stuff
            await App.serverMonitor.init();
            App.logger.enable();
            App.channelView.init();
            App.ui.init()   
            
            // Use events
            App.serverMonitor.addEventListener("onChannelStatusChange", function(monitorEvent){
                var channelObject = monitorEvent.detail.channel;
                App.channelView.updateChannelStatus( channelObject ); 
            })

            App.serverMonitor.addEventListener("onAppUnreachable", function(monitorEvent){
                state.fatalAppError = true  
            })

            App.serverMonitor.addEventListener("onInfoUpdate", function(monitorEvent){
                var channelObject = monitorEvent.detail.channel;
                App.channelView.updateChannelInfo( channelObject );

                
            })
            App.serverMonitor.addEventListener("onLogUpdate", function(monitorEvent){
                var channelObject = monitorEvent.detail.channel;
                //utils.log(channelObject.lastLogLine)
                App.channelView.updateLog( channelObject );
                             
            })
            // App.serverMonitor.addEventListener("onChannelUpdate",function(e){})

            utils.log("===========================================");
            utils.log(":: Initialization complete");
        }
    }
//--Utils.js ============================================================================
    const utils = {
        log: (...args) => { if (config.debug) { console.log(`${utils.formatTime(null,true)} |`, ...args);} }, 

        cancelEvent(e) {
            e.stopPropagation();
            e.preventDefault();
        },

        getChannelIdFromElement(element) {
            const channelEl = element.closest('[channel-id]');
            return channelEl?.getAttribute("channel-id") || "";
        },

        getChannelFromElement(element) {
            App.serverMonitor.getChannel( utils.getChannelIdFromElement( element ) );
        },

        getBoxFromChannelId( channelId ) {
            return document.querySelector(`[channel-id="${channelId}"]`);
        },

        arraysEqual(arr1, arr2) {
            return arr1.length === arr2.length && arr1.every((val, i) => val === arr2[i]);
        },
        
        /*function formatLogTime(ms){
            const date = !isNaN(ms) ? new Date(ms) : new Date();
            const hours = ('0' + date.getHours()).slice(-2);
            const minutes = ('0' + date.getMinutes()).slice(-2);
            const seconds = ('0' + date.getSeconds()).slice(-2);
            const milliseconds = ('00' + date.getMilliseconds()).slice(-3);
            const formatted = hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
            return formatted;
        }*/

        formatElapsedTime(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours   = Math.floor(minutes / 60);
            const days    = Math.floor(hours / 24);

            const h = hours % 24;
            const m = minutes % 60;
            const s = seconds % 60;

            if (days > 0) return `${days}d ${h}h`;
            if (hours > 0) return `${h}h ${m}m`;
            if (minutes > 0) return `${m}m ${s}s`;
            return `${s}s`;
        },

        formatTime(dateObj, useMs) {
            const d = dateObj || new Date();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            let timeString = `${hours}:${minutes}:${seconds}`;
            if (useMs) {
                const milliseconds = String(d.getMilliseconds()).padStart(3, '0');
                timeString += `.${milliseconds}`;
            }

            return timeString;
        },
        // "20:59:53" or "20:59:53.423"
        // General request method for loading data
        async request(url, options = {}) {
			try {
				const response = await fetch(url, options);
				if (!response.ok) {
					const text = await response.text();
					throw new Error(`HTTP ${response.status}: ${text}`);
				}
				const contentType = response.headers.get('content-type');
				if (contentType && contentType.includes('application/json')) {
					return response.json();
				} else {
					// If it's not JSON, return the text response
					return response.text();
				}
			} catch (error) {
				console.error(`API request failed: ${url}`, error);
				throw error;
			}
		},    
        throttle(func, delay) {
            let isThrottled = false;
            let lastArgs, lastContext;

            const wrapper = (...args) => {
                if (isThrottled) {
                    lastArgs = args;
                    lastContext = this;
                    return;
                }

                func.apply(this, args);
                isThrottled = true;

                setTimeout(() => {
                isThrottled = false;
                if (lastArgs) {
                    wrapper.apply(lastContext, lastArgs);
                    lastArgs = lastContext = null;
                }
                }, delay);
            };

            return wrapper;
        }   
    };
//--API.js ============================================================================
	const api = {
		getChannels: () => {
			return utils.request('/api/channels/');
		},
		getChannel: (username) => {
			return utils.request(`/api/channel/${encodeURIComponent(username)}`);
		},
		pauseChannel: (channelId) => {
			return utils.request(`/pause_channel/${channelId}`, { method: 'POST' });
		},
		resumeChannel: (channelId) => {
			return utils.request(`/resume_channel/${channelId}`, { method: 'POST' });
		},
		stopChannel: (channelId) => {
			return utils.request(`/stop_channel/${channelId}`, { method: 'POST' });
		},
		updateThumbnail: (channelId) => {
			return utils.request(`/update_thumbnail/${channelId}`, { method: 'POST' });
		},
		updateChannel: (channelId) => {
			return utils.request(`/update_channel/${channelId}`, { method: 'POST' });
		}
	};
//--Dialogs.js ============================================================================
    const dialogs = {
        // Dialog Edit Channel
        editChannel: {
            open(username) {
                api.getChannel(username).then(data => {
                    const dialog = document.getElementById('create-dialog');
                    if (!dialog) return;

                    // Set edit mode
                    document.getElementById('edit-flag').value = "true";

                    // Fill form
                    const fields = {
                        '#username-input': data.Username || "",
                        'select[name="resolution"]': data.Resolution || 1080,
                        'input[name="priority"]': data.Priority || 0,
                        'input[name="max_filesize"]': data.MaxFilesizeInt || 0,
                        'input[name="max_duration"]': data.MaxDurationInt || 0,
                        'input[name="pattern"]': data.Pattern || ""
                    };
                    
                    Object.entries(fields).forEach(([selector, value]) => {
                        const el = dialog.querySelector(selector);
                        if (el) {
                            el.value = value;
                            //console.log(selector, el.value )
                        } 
                    });

                    // Configure dialog
                    const usernameInput = document.getElementById('username-input');
                    if (usernameInput) {
                        usernameInput.readOnly = true;
                        usernameInput.style.opacity = "0.5";
                    }

                    const header = dialog.querySelector('.ts-header');
                    const submitBtn = dialog.querySelector('button[type="submit"]');

                    if (header) header.textContent = "Edit Channel";
                    if (submitBtn) submitBtn.textContent = "Save Changes";

                    dialog.addEventListener('close', this.onClose, { once: true });
                    dialog.showModal();
                });
            },

            onClose() {
                console.log("closed")
                document.getElementById('edit-flag').value = "false";

                const dialog = document.getElementById('create-dialog');
                const header = dialog?.querySelector('.ts-header');
                const submitBtn = dialog?.querySelector('button[type="submit"]');
                const usernameInput = document.getElementById('username-input');

                if (header) header.textContent = "Add Channel";
                if (submitBtn) submitBtn.textContent = "Add Channel";
                if (usernameInput) {
                    usernameInput.readOnly = false;
                    usernameInput.style.opacity = "1";
                }
            }
        },
        // Dialog Delete Channel Confirmation
        confirmDelete: {
            open(channelId) {
                const modal = document.getElementById('delete-confirm');
                if (!modal) return;

                modal.querySelector('.channel-name').textContent = channelId;
                const thumbnail = modal.querySelector('.channel-thumbnail');
                if (thumbnail) {
                    thumbnail.style.backgroundImage =
                        `url('./channel-images/${channelId}.jpg'), url('static/default_user.png')`;
                }

                const okBtn = modal.querySelector('.btn-ok');
                if (okBtn) {
                    okBtn.onclick = async () => {
                        try {
                            await api.stopChannel(channelId);
                            location.reload();
                        } catch (error) {
                            console.error("Failed to delete channel:", channelId, error);
                        }
                    };
                }

                modal.showModal();
            }
        }
    }
//--ServerMonitor.js ============================================================================
    function ServerMonitor(){
        // The purpose of this function is to track and extract info from SSE Events, 
        // prevent DOM swaps and track throughput.
        
        var lastEventTs = 0;
        
        const channels = {}; 
        const sessionChannels = JSON.parse( sessionStorage.getItem("channels") || "{}" ); // To keep track of thumbnailcache
           
        // ServerMonitor - Dispatch events related to channeltracking
        const events = new EventTarget();
        function dispatchEvent( eventName, channel, type, originalEvent ){
            events.dispatchEvent(new CustomEvent(eventName, { detail: { channel, type, originalEvent } })); 
        }

        function healthCheck(){
            if( (Date.now()-lastEventTs) > ( state.appInitData.Config.Interval*60000 ) ) {
                events.dispatchEvent(new CustomEvent("onAppUnreachable"), { detail: { } } );
            }
        }
        // ServerMonitor - trackFilesize
        function trackFilesize ( bytes, channel ) {
            const tracking = channel.dataTransferTracking || (channel.dataTransferTracking = [] );
            const lastEntry = tracking[tracking.length - 1];

            //  TrackFilesize - filesize will be lower if new videosegment starts.
            if ( channel.status !== "RECORDING" || ( lastEntry && bytes < lastEntry[0] ) ) {
                tracking.length = 0;
            }else if( tracking.length == 0 ) {
                tracking.push([bytes , Date.now()-5000]); // avoid spike at first "log"
            }
            //  TrackFilesize - Max 10 entries of samples
            if (tracking.length >= 10) tracking.shift(); 
            tracking.push([bytes, Date.now()]);
            
            //  TrackFilesize - Calculate throughput
            if (tracking.length > 2) {
                const first = tracking[0];
                const last = tracking[tracking.length - 1];
                const deltaBytes = last[0] - first[0];
                const deltaSec = (last[1] - first[1]) / 1000;
                if (deltaSec > 0) {
                    channel.avgThroughputBps = deltaBytes / deltaSec;
                }
            }
        }
        
        function parseInitialChannelsData(){
            let els = document.querySelectorAll(".ts-box .ts-badge"); // optimally 'ch-status-badge'
            els.forEach(chBadgeEl => {
                const channel = App.serverMonitor.getChannel( utils.getChannelIdFromElement( chBadgeEl ) )
                channel.status = chBadgeEl.textContent.trim(); // this is the only time we get status from static html
            });     
        } 

        // ServerMonitor - getChannelObject (or create)
        function getChannel(channelId) {
            if (!channels[channelId]) {
                channels[channelId] = {
                    id: channelId,
                    lastUpdateTs: Date.now(),
                    thumbAnticache: sessionChannels[channelId]?.thumbAnticache || 0,
                    status: null,
                    statusBefore: null,
                    log: [],
                    dataTransferTracking: [],
                    avgThroughputBps: 0
                };
            }
            return channels[channelId];
        }
       
        // ServerMonitor - parseSSEvent for name and log type.
        function extractJsonDataFromEvent(e) {
            try { 
                // e.detail.data -> contains the html sent by go ( but as string )
                const jsonString = e.detail.data.match(/class="[^"]*\bjson-channel-data\b[^"]*"[^>]*>([^<]*)<\s*\/\s*[^>]+>/)[1];
                return JSON.parse( jsonString )
            } catch(err) {
                return null;
            }
        }
        
        // ServerMonitor - parseSSEvent for name and log type.
        function getSSEInfo(e) {
            const sseId = e.detail.elt.getAttribute('sse-swap'); 
            const divider = sseId.lastIndexOf("-");
            return {
                channelId: sseId.substring(0, divider),
                logType: sseId.substring(divider + 1)
            };
        } 

        // ServerMonitor - Core functionality
        function handleBeforeSwap(e){
            const sseInfo = getSSEInfo(e); // returns { channelId, logType }
            const channel = getChannel( sseInfo.channelId ); // get or create channel data object
            const now = Date.now();
            channel.lastUpdateTs = now;
            lastEventTs = now;

            if ( sseInfo.logType === "info" ) {
                channel.lastInfoData = e.detail.data;
                const ch_sseData = extractJsonDataFromEvent(e);
                
                if(ch_sseData) {          
                    channel.infoData = ch_sseData; // Store
                    // Tracking Status Change
                    if( ch_sseData.status !== channel.status ) {
                        channel.statusBefore = channel.status;
                        channel.status = ch_sseData.status;
                        // Send a updated channel object
                        dispatchEvent( 'onChannelStatusChange', channel, sseInfo.logType, e );
                    }
                    // Tracking Throughput
                    if( (channel.status === "RECORDING") && (ch_sseData.filesizeBytes !== channel.filesizeBytes) ) {
                        trackFilesize( ch_sseData.filesizeBytes, channel );
                        channel.filesizeBytes = ch_sseData.filesizeBytes; 
                    }
                }else {
                   utils.log("no json data", channel.id, channel)
                }
                dispatchEvent('onInfoUpdate', channel, sseInfo.logType, e );              
            }else if(sseInfo.logType === "log") {
                channel.lastLogData = e.detail.data;
                channel.lastLogLine = e.detail.data.split("\n").pop();
                dispatchEvent('onLogUpdate', channel, sseInfo.logType, e );
            }else {
                utils.log("Unexpected event type", channel.id, channel, e)
            }

            dispatchEvent('onChannelUpdate', channel, sseInfo.logType, e);
            // Cancel DOM swaps for collapsed items
            /*if ( e.detail.elt.closest(".js-is-collapsed") ) {

            }*/
            e.preventDefault();
        }

        function handleAfterSwap(e){
            const sseInfo = getSSEInfo(e);
            dispatchEvent('onDOMSwapped', getChannel( sseInfo.channelId ), sseInfo.logType, e );
        }
                
        // ServerMonitor - Interface
        this.getChannels = function(){return channels;}
        this.getChannel = getChannel
        this.addEventListener = events.addEventListener.bind(events);
        this.removeEventListener = events.removeEventListener.bind(events);

        this.countActiveChannels = function(){
            return Object.values( channels ).filter(ch => ch.status === "RECORDING").length;
        }

        this.getAverageThroughputMbps = function(){
            const totalBytesPerSec = Object.values(channels)
                .filter(ch => ch.status === "RECORDING" && ch.avgThroughputBps > 0)
                .reduce((sum, ch) => sum + ch.avgThroughputBps, 0);
            return totalBytesPerSec / (1024 * 1024);
        }
        
        // ServerMonitor INIT 

        this.init = function() {
            utils.log(":: ServerMonitor Init" ) 
            utils.log(":: sessionChannels", sessionChannels )
            parseInitialChannelsData()
               
            document.body.addEventListener('htmx:sseBeforeMessage', handleBeforeSwap);
            document.body.addEventListener('htmx:afterSwap', handleAfterSwap);            
            
            window.addEventListener("beforeunload", () => {
                sessionStorage.setItem("channels", JSON.stringify( App.serverMonitor.getChannels() ));
                state.fatalAppError = false; 
                sessionStorage.setItem("state", JSON.stringify( App.state ));
            });

            setInterval( healthCheck, state.appInitData.Config.Interval*60000 );
            utils.log(":: ServerMonitor Ready" )     
        };          
    }
//--UI.js ============================================================================
    function UI(){

        const ThroughputUpdater = (() => {
            let intervalId = null;
            var recInfoEl;
            var indicator;
            
            function update() {
                const activeCount = App.serverMonitor.countActiveChannels();

                if (activeCount > 0) {
                    indicator.classList.add("recording")
                    const mbps = App.serverMonitor.getAverageThroughputMbps();
                    recInfoEl.textContent = `Recording ${activeCount} channel${activeCount > 1 ? "s" : ""} ${mbps.toFixed(2)} MB/s`;
                } else {
                    indicator.classList.remove("recording")
                    recInfoEl.textContent = "Waiting for channels to go online";
                }
            }

            return {
                start(delayMs = 1000) {
                    recInfoEl = document.querySelector(".recording-info");
                    indicator = document.querySelector(".activity-indicator")
                    if (intervalId !== null) return; // already running
                    intervalId = setInterval(update, delayMs);
                },
                stop() {
                    if (intervalId !== null) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }
            };
        })();
        // UI - updateDebugCounters
        function updateDebugCounters() {
            if (!config.debug) return;

            const skippedEl = document.getElementById("sse-skipped");
            const passedEl = document.getElementById("sse-passed");

            if (skippedEl) skippedEl.textContent = state.debugCounters.skipped;
            if (passedEl) skippedEl.textContent = state.debugCounters.passed;
        }
        // UI - Setup Input filters
        function setupInputFilter() {
            document.getElementById('username-input').addEventListener('input', (e) => {
                let value = e.target.value.trim();
                // Extract username from Chaturbate URL
                if (value.includes('chaturbate.')) {
                    const match = value.match(/^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?chaturbate\.[a-z.]+\/([^\/\s?#]+)/i);
                    if (match) value = match[1];
                }
                // Clean CSV-style input ( no duplicates, no empty items )
                e.target.value = value.split(',').map(v => v.trim()).filter(v => v.length > 0).join(',');
            });
        }
        // UI - Setup Click Handlers
        function setupClickHandlers() {
            document.getElementById("auto-sort-toggle").addEventListener("change", (e) => {
                if( isAutoSortEnabled() ) App.channelView.update();
            });
        }
        // UI - Start Server Time Clock
        function startClock(){
            var clockEl = document.body.querySelector('#system-clock');
            var uptimeEl = document.body.querySelector('#uptime-info');
            var clockInterval = setInterval(function(){
                if(clockEl) clockEl.textContent = utils.formatTime( new Date(Date.now() + state.timeOffset ) );
                if(uptimeEl) {
                    if( state.fatalAppError ) {
                        clearInterval(clockInterval);
                        uptimeEl.textContent = uptimeEl.textContent + " - ERROR";
                    } else {
                        uptimeEl.textContent = "Uptime: " + utils.formatElapsedTime( Date.now() - state.appInitData.AppInitUnixMs ) ;
                    }
                } 
            },500)
        }

        function isAutoSortEnabled(){
            return Boolean(document.getElementById("auto-sort-toggle").checked);
        }
        // UI - Init
        this.init = function(){
            utils.log(':: Init UI');
            setupClickHandlers();
            setupInputFilter();
            startClock();
            ThroughputUpdater.start();
        }
        
        this.update = function(){
            
        }     
        
        // UI - End
    }
//--channelview.js ============================================================================
    function ChannelView(){
        // UI - List sort
        var listSorter = new ListSorter();
        const _self = this
        async function updateThumbnail(channelId) {
            const channelBox = utils.getBoxFromChannelId(channelId);
            
            if (!channelBox) return utils.log("Could not find thumbnail");
            channelBox.classList.add("loading-thumbnail");
            try {
                await api.updateThumbnail(channelId);
                makeThumbnailUncached(channelId);
            } catch (error) {
                console.error("Failed to update thumbnail:", channelId, error);
            } finally {
                setTimeout(() => {
                    channelBox.classList.remove("loading-thumbnail");
                }, 500);
            }
        }

        function makeThumbnailUncached(channelId, anticacheInt ) {
            const channel = App.serverMonitor.getChannel(channelId);
            const channelBox = utils.getBoxFromChannelId(channel.id);
            channelBox.querySelector(".channel-thumbnail").style.backgroundImage =
                `url(./channel-images/${channel.id}.jpg?${( anticacheInt || ++channel.thumbAnticache )}), url(static/default_user.png)`;
        }

        function updateChannelStatusBadge(channel) {
            const channelBox = utils.getBoxFromChannelId(channel.id);
            // Update CSS classes
            config.statusOrder.forEach(status => { channelBox.classList.remove(`ch-status-${status.toLowerCase()}`); });
            channelBox.classList.add(`ch-status-${channel.status.toLowerCase()}`);
            // Update status text
            channelBox.querySelector(".ch-status").textContent = channel.status;
        }  


        function toggleCollapse(e) {
            const channelBox = e.target.closest('[channel-id]');
            if (!channelBox) return;
            
            const channelId = channelBox.getAttribute("channel-id");
            const channel = App.serverMonitor.getChannel(channelId);
            
            if (channelBox.classList.contains("js-is-collapsed")) { 
                channelBox.classList.remove("js-is-collapsed");
                if( !channel.lastLogData ) {
                    // js didn't catch any events yet - force info update ( this only happens once - if any )
                    //api.updateChannel(channelId); // This is not needed
                    // if channel.lastLogData is empty, we do nothing --- 
                }else {
                     _self.updateLog ( channel, true ); 
                }    
                const textarea = channelBox.querySelector("textarea");
                if (textarea) {
                    textarea.style.overflowY = "hidden";
                    setTimeout(() => { textarea.style.overflowY = "auto"; }, 600);
                }                
            } else {
                channelBox.classList.add("js-is-collapsed");
            }
            
            // Make sure log textearea is scrolled to bottom on expand

        }

        function setupChannelButtons(){
            document.body.addEventListener('click', (e) => {
                const channel = App.serverMonitor.getChannel( utils.getChannelIdFromElement(e.target) );
                if (e.target.closest('.btn-openweb')) {
                    window.open(`${state.appInitData.Config.Domain}${channel.id}/`, '_blank');
                    utils.cancelEvent(e);
                } else if (e.target.closest('.btn-edit')) {
                    dialogs.editChannel.open(channel.id);
                    utils.cancelEvent(e);

                } else if (e.target.closest('.btn-delete')) {
                    dialogs.confirmDelete.open(channel.id);
                    utils.cancelEvent(e);

                } else if (e.target.closest('.ch-status')) {
                    (channel.status === "PAUSED" ?  api.resumeChannel : api.pauseChannel ).apply(api,[channel.id]);
                    utils.cancelEvent(e);
                    
                } else if (e.target.closest('.channel-thumbnail')) {
                    var isOnline = ['RECORDING', 'QUEUED'].includes(channel.status); // if QUEUED the channel is technically online
                    isOnline ? updateThumbnail(channel.id) : toggleCollapse(e);
                    utils.cancelEvent(e);

                } else if (e.target.closest('.channel-header')) {
                    toggleCollapse(e);
                    utils.cancelEvent(e);
                }
            });
        }
        
        this.updateChannelInfo = function( channel ) {
            var box = utils.getBoxFromChannelId( channel.id );
            var data = channel.infoData;
            // Only update if box is not collapsed
            if (!box.closest(".js-is-collapsed")) {
                var fields = box.querySelectorAll('[data-value-id]');
                fields.forEach(function( field ) {
                    var key = field.getAttribute('data-value-id');
                    if ( data.hasOwnProperty( key ) ) {
                        if(field.textContent !== data[key]) {
                            field.textContent = data[key];
                        }
                    } else {
                        field.textContent = '-'; // fallback if key doesn't exist
                    }
                });
            }
        };

        this.updateLog = function(channel, forceScrollToEnd) {
            if( !channel.lastLogData ) return;
            
            var box = utils.getBoxFromChannelId(channel.id);
            if ( !box.closest(".js-is-collapsed") && box.querySelector("[type=checkbox]").checked ) {
                const textarea = box.querySelector("textarea");
                const isAtBottom = textarea.scrollTop + textarea.clientHeight >= ( textarea.scrollHeight-10 );
           
                textarea.textContent = channel.lastLogData;
                
                if (isAtBottom || forceScrollToEnd) {
                    textarea.scrollTop = textarea.scrollHeight; // auto-scroll
                } 
            }
        };      
        this.updateChannelStatus = function( channel ){
            updateChannelStatusBadge( channel );
            listSorter.scheduleSort();
        }
        
        this.updateChannelThumbnail = function(channel){
            updateThumbnail(channel);
        }

        this.update = function(){
            listSorter.scheduleSort();
        }
        
        // >> Channel View - init
        this.init = function(){
            setupChannelButtons();
            listSorter.init()

            // Check if any thumbnails needs to uncached
            Object.values( App.serverMonitor.getChannels() ).forEach(ch => {
                if ( ch.thumbAnticache ) {
                    utils.log(":: Thumbs Anticache for " + ch.channelId, ch)
                    makeThumbnailUncached(ch.id, ch.thumbAnticache);
                }
            });
        }
    }
 //--channelview.listSorter.js ============================================================================
    function ListSorter(){
        //var timeout = null;
        var isAnimating = null;
        let userMouseMoveStoppedMs = 0;
        var lastOrder = []
        // scheduleSort  ( ListSorter )
        function scheduleSort() {
            if( isAnimating ) return // A new check will be run on animation complete
            if ( document.getElementById("auto-sort-toggle" )?.checked === false ) return; 
            
            if ( ( Date.now() - userMouseMoveStoppedMs ) < 1000 ) { 
                setTimeout( scheduleSort , 200); 
                return;
            }
            setTimeout( performSort, 50 );
        }
        function getSortPriority( element ) {
            const badgeEl = element.querySelector('.ts-badge');
            const badgeText = badgeEl?.textContent.trim() || '';
            return config.statusOrder.indexOf(badgeText);
        }            
        // Sort Data ( ListSorter )
        function performSort() {
            if (isAnimating) return;
            const container = document.querySelector(".channel-list .ts-wrap");
            const boxes = Array.from( container.querySelectorAll('.channel-box') );
            boxes.sort((a, b) => {
                const prioA = getSortPriority(a);
                const prioB = getSortPriority(b);
                return prioA !== prioB ? ( prioA - prioB ) : utils.getChannelIdFromElement(a).localeCompare(utils.getChannelIdFromElement(b));
            });
            const newOrder = boxes.map(box => utils.getChannelIdFromElement(box));
            
            // Check if sortorder has changed since last animation
            if ( !utils.arraysEqual(newOrder, lastOrder)) {;
                // Changed!
                lastOrder = newOrder;
                // Start new animation
                setTimeout(function(){
                    prepAnimation(boxes, container);
                },50)
                
            }else {
                // Do nothing
            }
        }

        function finishAnimation(){
            if(!performSort) utils.log("performSort not in scope");
            setTimeout( function(){
                isAnimating = false;
                performSort()    
            }, 500);
        }

        function getAnimationOvershoot(distance, reference = 240, max = 1.6, min = 0.4) {
            const factor = distance / reference;
            return ( max / factor ).toFixed(2);
        }

        // Sorting Animation ( ListSorter )
        function prepAnimation(boxes, container) {
            if (!window.gsap) {
                boxes.forEach(box => container.appendChild(box));
                return;
            }

            if (isAnimating) return;
            const positions = new Map();
            // Capture initial positions before DOM mutations
            boxes.forEach(box => positions.set(box, box.getBoundingClientRect()));
            
            setTimeout(function(){
                animateBoxes(boxes, container, positions);
            },50)
        }

        function animateFinal(movedBoxes){
            isAnimating = true;
            const tl = gsap.timeline({ onComplete: () => finishAnimation() });
            const animationDuration = config.animationTime / 1000;
            movedBoxes.forEach(({ box, fromY, distance }, idx) => {
                tl.add(gsap.fromTo(
                    box,
                    { y: fromY },
                    {
                        y: 0,
                        duration: animationDuration,
                        ease: `back.inOut(${getAnimationOvershoot(distance)})`
                    }
                ), 0.014 * idx);
            });
        }
        function animateBoxes(boxes, container, positions) {
            if (isAnimating) return;
            // Move boxes to new order
            boxes.forEach((box, i) => {
                if (container.children[i] !== box) {
                    container.insertBefore(box, container.children[i]);
                }
            });
            
            requestAnimationFrame(function(){
                // Measure final positions and prepare movedBoxes
                const movedBoxes = [];
                boxes.forEach((box) => {
                    const oldPos = positions.get(box);
                    const newPos = box.getBoundingClientRect();
                    const distance = Math.abs(oldPos.top - newPos.top);

                    if (distance !== 0) {
                        movedBoxes.push({
                            box,
                            fromY: oldPos.top - newPos.top,
                            distance
                        });
                    }
                });

                if (movedBoxes.length === 0) {
                    finishAnimation();
                    return;
                }
                animateFinal(movedBoxes)
                /*requestAnimationFrame(function(){
                    
                })*/
            })
        }


        // List sort - Interface
        this.scheduleSort = scheduleSort;
        // >> List sort - Init
        this.init = function(){
            document.body.addEventListener('mousemove', () => {
                userMouseMoveStoppedMs = Date.now();
            });
        }
    }


    // App.utils.js
    App.logger = (() => {

        function getStatusIcon(channel){
            var recStoppedIcon = channel.statusBefore == "RECORDING" ? "⛔" : "📍";
            switch (channel.status) {
                case "RECORDING": return "📍"+"💚";
                case "PAUSED":    return recStoppedIcon + "⏸️";
                case "BLOCKED":   return recStoppedIcon + "⚠️";
                case "QUEUED":    return recStoppedIcon + "🕝";
                case "OFFLINE":   return recStoppedIcon + "✖️";
                default:          return "";
            }           
        }

        function handleStatusChange(monitorEvent) {
            var channel = monitorEvent.detail.channel; 
            utils.log("🎺"+getStatusIcon(channel)+" ["+channel.id+"] - "+ channel.statusBefore+" > "+channel.status)
        }

        return {
            enable(){
                App.serverMonitor.addEventListener( 'onChannelStatusChange', handleStatusChange );         
            },
            disable(){
                App.serverMonitor.removeEventListener( 'onChannelStatusChange', handleStatusChange ); 
            }
        }
    })()

//--ChannelLogger.js ============================================================================
    function ChannelLogger(){
                
    }
    // Public API
    window.cbdvr = {
        // Core functionality
        editChannel: dialogs.editChannel.open,
        getChannels: () => api.getChannels(),
        getChannel: (username) => api.getChannel(username),
        pauseChannel: (id) => api.pauseChannel(id),
        resumeChannel: (id) => api.resumeChannel(id),
        updateThumbnail: (id) => eventHandlers.updateThumbnail(id),
        serverMonitor: App.serverMonitor,
        // Utility functions
        enableDebug() {
            config.debug = !config.debug;
            document.body.classList.toggle("debug");
        },

        blurForDemo() {
            document.body.classList.toggle("blur-for-demo");
        },

        getChannelsCSV() {
            api.getChannels().then(data => {
                const names = data.map(ch => ch.Username).join(',');
                console.log(names);
            });
        },

        insertUserAgent() {
            const textarea = document.querySelector('#settings-dialog textarea[name="user_agent"]');
            if (textarea) textarea.value = navigator.userAgent;
        },
        // Debug utilities
        getTrackedChannels: function(){ return App.serverMonitor.getChannels(); },
        debug: config.debug
    };

    // Start the application
    document.addEventListener("DOMContentLoaded", App.init );
})();





