(function() {
    'use strict';

    // Configuration and state
    const config = {
        debug: new URLSearchParams(window.location.search).has("debug"),
        animationTime: 2000,
        statusOrder: ['RECORDING', 'QUEUED', 'BLOCKED', 'OFFLINE', 'PAUSED']
    };

    const state = {
        channels: {},
        sessionChannels: JSON.parse(sessionStorage.getItem("channels") || "{}"),
        lastOrder: [],
        lastUserMoved: 0,
        lastSSEEvent:0,
        isAnimating: false,
        appInitDate: null,
        webInitDate: null,
        appInitTs: 0,
        webInitTs: 0,        
        debugCounters: { skipped: 0, passed: 0 }
    };

    // Utility functions
    const utils = {
        log: (...args) => config.debug && console.log(...args),
        
        cancelEvent(e) {
            e.stopPropagation();
            e.preventDefault();
        },

        getChannelId(element) {
            const channelEl = element.closest('[channel-id]');
            return channelEl?.getAttribute("channel-id") || "";
        },

        getChannelBox(channelId) {
            return document.querySelector(`[channel-id="${channelId}"]`);
        },

        parseSSEEvent(evt) {
            const sseId = evt.detail.elt.getAttribute('sse-swap');
            if (!sseId) return {};
            
            const divider = sseId.lastIndexOf("-");
            return {
                channelId: sseId.substring(0, divider),
                logType: sseId.substring(divider + 1)
            };
        },

        arraysEqual(arr1, arr2) {
            return arr1.length === arr2.length && arr1.every((val, i) => val === arr2[i]);
        },
        
        formatTime (dateArg){
            const date = dateArg || new Date(); // or your Date object

            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const timeString = `${hours}:${minutes}:${seconds}`;
            return timeString;
        },

        formatDuration(ms) {
            const sec = Math.floor(ms / 1000);
            const units = [
                { label: "day", value: 86400 },
                { label: "hour", value: 3600 },
                { label: "min", value: 60 },
                { label: "second", value: 1 },
            ];

            let remaining = sec;
            const amounts = [];

            for (const unit of units) {
                const amount = Math.floor(remaining / unit.value);
                remaining %= unit.value;
                if (amount > 0 || (unit.label === "second" && amounts.length === 0)) {
                    amounts.push({ label: unit.label, amount,});
                }
            }

            const parts = [];
            for (const item of amounts) {
                if (item.label !== "min") {
                    parts.push(`${item.amount} ${item.label}${item.amount !== 1 ? "s" : ""}`);
                }
                if (parts.length >= 2) {
                break;
                }
            }

            const minutes = amounts.find(u => u.label === "min");
            if (minutes) {
                parts.push(`${minutes.amount} ${minutes.label}${minutes.amount !== 1 ? "s" : ""}`);
            }
            return parts.join(" ");
        }


    };

    // API functions
    const api = {
        async request(url, options = {}) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            } catch (error) {
                console.error(`API request failed: ${url}`, error);
                throw error;
            }
        },

        getChannels() {
            return this.request('/api/channels/');
        },

        getChannel(username) {
            return this.request(`/api/channel/${encodeURIComponent(username)}`);
        },

        pauseChannel(channelId) {
            return this.request(`/pause_channel/${channelId}`, { method: 'POST' });
        },

        resumeChannel(channelId) {
            return this.request(`/resume_channel/${channelId}`, { method: 'POST' });
        },

        stopChannel(channelId) {
            return this.request(`/stop_channel/${channelId}`, { method: 'POST' });
        },

        updateThumbnail(channelId) {
            return this.request(`/update_thumbnail/${channelId}`, { method: 'POST' });
        },

        updateChannel(channelId) {
            return this.request(`/update_channel/${channelId}`, { method: 'POST' });
        }
    };

    // Channel management
    const channelManager = {
        getChannel(channelId) {
            if (!state.channels[channelId]) {
                state.channels[channelId] = {
                    id: channelId,
                    lastUpdateTs: Date.now(),
                    thumbAnticache: state.sessionChannels[channelId]?.thumbAnticache || 0,
                    status: null,
                    dataTransferTracking: [],
                    avgThroughputBps: 0
                };
            }
            return state.channels[channelId];
        },

        updateStatus(channel) {
            this.updateVisuals(channel);
            utils.log(`Channel status updated: ${channel.id} [${channel.status}]`);
            
        },

        updateVisuals(channel) {
            const channelBox = utils.getChannelBox(channel.id);
            if (!channelBox) return;

            // Update status display
            const statusEl = channelBox.querySelector(".ch-status");
            if (statusEl) statusEl.textContent = channel.status;

            // Update CSS classes
            config.statusOrder.forEach(status => {
                channelBox.classList.remove(`ch-status-${status.toLowerCase()}`);
            });
            channelBox.classList.add(`ch-status-${channel.status.toLowerCase()}`);

            // Trigger updates
            listSorter.scheduleSort();
            this.updateCounters();
        },

        updateCounters() {
            const statusCounts = Object.values(state.channels).reduce((acc, ch) => {
                acc[ch.status] = (acc[ch.status] || 0) + 1;
                return acc;
            }, {});
            console.log( statusCounts )
            document.querySelectorAll(".mini-badges > div").forEach(el => {
                const match = el.className.match(/mini-badge-(\w+)/i);
                if (!match) return;

                const status = match[1].toUpperCase();
                const count = statusCounts[status] || 0;

                if (count > 0) {
                    el.textContent = count;
                    el.style.display = "";
                    gsap?.fromTo(el, { opacity: 0.4 }, { opacity: 0.7, duration: 1 });
                } else {
                    el.style.display = "none";
                }
            });

            // this.updateThroughput();  // <---------------------------------------------------------
        },

        updateThroughput() {
            const activeCount = Object.values(state.channels).filter(ch => ch.status === "RECORDING").length;    
            const recInfoEl = document.querySelector(".recording-info");
            if( !activeCount ) {
                if(recInfoEl) recInfoEl.textContent = "Waiting for channels to go online"
                return;
            } 

            const totalBytesPerSec = Object.values(state.channels)
                .filter(ch => ch.status === "RECORDING" && ch.avgThroughputBps > 0)
                .reduce((sum, ch) => sum + ch.avgThroughputBps, 0);
            
            const mbps = totalBytesPerSec / (1024 * 1024);
           
            utils.log( state.channels, "mbps :" + mbps)
 
            recInfoEl.textContent = `Recording ${activeCount}channel${activeCount > 1 ? "s" : ""} ${mbps.toFixed(2)} MB/s`;                       
        },

        updateTime() {
            var el = document.querySelector("#time-information");
            const activeCount = Object.values(state.channels).filter(ch => ch.status === "RECORDING").length;    
            const recInfoEl = document.querySelector(".recording-info");
            if( !activeCount ) {
                if(recInfoEl) recInfoEl.textContent = "Waiting for channels to go online"
                return;
            } 

            const totalBytesPerSec = Object.values(state.channels)
                .filter(ch => ch.status === "RECORDING" && ch.avgThroughputBps > 0)
                .reduce((sum, ch) => sum + ch.avgThroughputBps, 0);
            
            const mbps = totalBytesPerSec / (1024 * 1024);
           
            utils.log( state.channels, "mbps :" + mbps)
 
            recInfoEl.textContent = `Recording ${activeCount}channel${activeCount > 1 ? "s" : ""} ${mbps.toFixed(2)} MB/s`;                       
        },

        updateActivityIndicator() {
            var el = document.querySelector(".activity-indicator");
            el.classList.add("blink")
            setTimeout(function(){el.classList.remove("blink")},2000)
        },        

        trackFilesize ( bytes, channel) {
            if ( !bytes ) return;
            
            const tracking = channel.dataTransferTracking || (channel.dataTransferTracking = []);
            const lastEntry = tracking[tracking.length - 1];

            // Detect reset
            if ( channel.status !== "RECORDING" || ( lastEntry && bytes < lastEntry[0] ) ) {
                // This might happen if the source resets or rolls over
                tracking.length = 0;
            }

            // Maintain max 10 entries
            if (tracking.length >= 10) tracking.shift();
            tracking.push([bytes, Date.now()]);

            // Calculate throughput
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
    };

    // List sorting functionality
    const listSorter = {
        timeout : null,
        scheduleSort() {
            var autoSortDisabledInUI = document.getElementById("auto-sort-toggle")?.checked === false;
            if ( state.isAnimating || autoSortDisabledInUI ) return;
            clearTimeout(this.timeout);
            
            const now = Date.now();
            if (now - state.lastUserMoved < 1000) {
                setTimeout(() => this.scheduleSort(), 500);
                return;
            }

            // Create small delay regardless
            this.timeout = setTimeout(function(){ listSorter.performSort();},500);
        },

        performSort() {
            const container = document.querySelector('.ts-wrap');
            if (!container) return;

            const boxes = Array.from(container.querySelectorAll('.channel-box'));
            
            boxes.sort((a, b) => {
                const priorityA = this.getSortPriority(a);
                const priorityB = this.getSortPriority(b);
                if (priorityA !== priorityB) return priorityA - priorityB;
                return utils.getChannelId(a).localeCompare(utils.getChannelId(b));
            });

            const newOrder = boxes.map(box => utils.getChannelId(box));
            if (utils.arraysEqual(newOrder, state.lastOrder)) return;

            this.animateSort(boxes, container);
            state.lastOrder = newOrder;
        },

        getSortPriority(element) {
            const badgeEl = element.querySelector('.ts-badge');
            const badgeText = badgeEl?.textContent.trim() || '';
            return config.statusOrder.indexOf(badgeText);
        },

        animateSort(boxes, container) {
            if (!window.gsap) {
                boxes.forEach(box => container.appendChild(box));
                return;
            }

            const positions = new Map();
            boxes.forEach(box => positions.set(box, box.getBoundingClientRect()));
            boxes.forEach(box => container.appendChild(box));

            state.isAnimating = true;
            let completed = 0;

            boxes.forEach(box => {
                const oldPos = positions.get(box);
                const newPos = box.getBoundingClientRect();
                const from = {
                    x: oldPos.left - newPos.left,
                    y: oldPos.top - newPos.top
                };

                gsap.fromTo(box, from, {
                    x: 0, y: 0,
                    duration: config.animationTime / 1000,
                    ease: "elastic.inOut(1.5,1.5)",
                    delay: (Math.random()*.6),
                    onComplete: () => {
                        completed++;
                        if (completed === boxes.length) {
                            state.isAnimating = false;
                            setTimeout(() => this.scheduleSort(), 500);
                        }
                    }
                });
            });
        }
    };

    // Event handlers
    const eventHandlers = {
        setupSSE() {
            document.body.addEventListener('htmx:sseBeforeMessage', (e) => {
                state.lastSSEEvent = Date.now(); // <--not sure wehre i was going with this
                channelManager.updateActivityIndicator();
                const sseInfo = utils.parseSSEEvent(e);
                if (!sseInfo.channelId) return;

                const channel = channelManager.getChannel(sseInfo.channelId);
                channel.lastUpdateTs = Date.now();
                

                if (sseInfo.logType === "info") {
                    const ch_sseData = this.extractData(e)
                    if( ch_sseData.status !== channel.status ) {
                        channel.status = ch_sseData.status;
                        channelManager.updateStatus(channel);
                    }
                    channelManager.trackFilesize( ch_sseData.filesize , channel );
                } 
                //else if (sseInfo.logType === "log" && channel.status === "RECORDING") {
                   // we don't really need anything from here
                //}
                
                if ( e.detail.elt.closest(".js-is-collapsed") || ( sseInfo.logType === "log" && !e.detail.elt.closest(".ts-box").querySelector("[type=checkbox]").checked ) ) {
                        e.preventDefault();
                        state.debugCounters.skipped++;
                } else {
                    state.debugCounters.passed++;
                }
                this.updateDebugCounters();
            });

            document.body.addEventListener('htmx:afterSwap', (e) => {
                this.scrollLogTextarea(e.detail.elt);
            });
        },

        extractData(e) {
            const match = e.detail.data.match(/class="json-chinfo"[^>]*>([^<]*)<\/span>/);
            const jsonString = match ? match[1].trim() : null;
            return JSON.parse( jsonString )
        },

        setupClickHandlers() {
            const checkbox = document.getElementById("auto-sort-toggle");
            checkbox?.addEventListener("change", (e) => {
                if(e.target.checked) listSorter.scheduleSort();
            }); 

            document.body.addEventListener('click', (e) => {
                const channelId = utils.getChannelId(e.target);
                
                if (e.target.closest('.btn-openweb')) {
                    const siteUrl = document.querySelector(".content > .is-start-labeled > .label")?.textContent;
                    window.open(`${siteUrl}${channelId}/`, '_blank');
                    utils.cancelEvent(e);
                    
                } else if (e.target.closest('.btn-edit')) {
                    dialogs.editChannel.open(channelId);
                    utils.cancelEvent(e);
                    
                } else if (e.target.closest('.btn-delete')) {
                    dialogs.confirmDelete.open(channelId);
                    utils.cancelEvent(e);
                    
                } else if (e.target.closest('.ch-status')) {
                    const isPaused = e.target.closest('.ch-status-paused');
                    (isPaused ? api.resumeChannel : api.pauseChannel).apply(api,[channelId]);
                    utils.cancelEvent(e);
                    
                } else if (e.target.closest('.channel-thumbnail')) {
                    const channel = channelManager.getChannel(channelId);
                    if (['RECORDING', 'QUEUED'].includes(channel.status)) {
                        this.updateThumbnail(channelId);
                    } else {
                        this.toggleCollapse(e);
                    }
                    utils.cancelEvent(e);
                    
                } else if (e.target.closest('.channel-header')) {
                    this.toggleCollapse(e);
                    utils.cancelEvent(e);
                }

            });
        },

        setupInputFilters() {
            const usernameInput = document.getElementById('username-input');
            if (!usernameInput) return;

            usernameInput.addEventListener('input', (e) => {
                let value = e.target.value.trim();

                // Extract username from Chaturbate URL
                if (value.includes('chaturbate.')) {
                    const match = value.match(/^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?chaturbate\.[a-z.]+\/([^\/\s?#]+)/i);
                    if (match) value = match[1];
                }

                // Clean CSV-style input
                e.target.value = value
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v.length > 0)
                    .join(',');
            });
        },

        toggleCollapse(e) {
            const channelBox = e.target.closest('[channel-id]');
            if (!channelBox) return;

            const channelId = channelBox.getAttribute("channel-id");
            const textarea = channelBox.querySelector("textarea");
            
            if (channelBox.classList.contains("js-is-collapsed")) { 
                channelBox.classList.remove("js-is-collapsed");
                api.updateChannel(channelId);   
            } else {
                channelBox.classList.add("js-is-collapsed");
            }
            
            if (textarea) {
                textarea.style.overflowY = "hidden";
                setTimeout(() => { textarea.style.overflowY = "auto"; }, 600);
            }

            
        },

        async updateThumbnail(channelId) {
            const channelBox = utils.getChannelBox(channelId);
            if (!channelBox) return;

            channelBox.classList.add("loading-thumbnail");
            
            try {
                await api.updateThumbnail(channelId);
                this.makeThumbnailUncached(channelId);
            } catch (error) {
                console.error("Failed to update thumbnail:", channelId, error);
            } finally {
                setTimeout(() => {
                    channelBox.classList.remove("loading-thumbnail");
                }, 500);
            }
        },

        makeThumbnailUncached(channelId, anticacheInt) {
            const channel = channelManager.getChannel(channelId);
            const channelBox = utils.getChannelBox(channelId);
            const thumbnail = channelBox?.querySelector(".channel-thumbnail");
            
            if (thumbnail) {
                const anticache = anticacheInt || ++channel.thumbAnticache;
                thumbnail.style.backgroundImage = 
                    `url(./channel-images/${channelId}.jpg?${anticache}), url(static/default_user.png)`;
            }
        },

        scrollLogTextarea(element) {
            if ( element.closest(".js-is-collapsed") ) return;
            
            const textarea = element.tagName === "TEXTAREA" ? element : element.querySelector("textarea");
            const checkbox = element.closest(".channel-box")?.querySelector("[type=checkbox]");
            
            if (textarea && checkbox?.checked) {
                setTimeout(() => { textarea.scrollTop = textarea.scrollHeight; }, 1);
            }
        },

        updateDebugCounters() {
            if (!config.debug) return;
            
            const skippedEl = document.getElementById("sse-skipped");
            const passedEl = document.getElementById("sse-passed");
            
            if (skippedEl) skippedEl.textContent = state.debugCounters.skipped;
            if (passedEl) skippedEl.textContent = state.debugCounters.passed;
        }
    };

    // Dialog management
    const dialogs = {
        editChannel: {
            open(username) {
                api.getChannel(username).then(data => {
                    const dialog = document.getElementById('create-dialog');
                    if (!dialog) return;

                    // Set edit mode
                    document.getElementById('edit-flag').value = "true";
                    
                    // Fill form
                    const fields = {
                        'username-input': data.Username || "",
                        'select[name="resolution"]': data.Resolution || 1080,
                        'input[name="priority"]': data.Priority || 0,
                        'input[name="max_filesize"]': data.MaxFilesizeInt || 0,
                        'input[name="max_duration"]': data.MaxDurationInt || 0,
                        'input[name="pattern"]': data.Pattern || ""
                    };

                    Object.entries(fields).forEach(([selector, value]) => {
                        const el = document.querySelector(selector);
                        if (el) el.value = value;
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
    };

    // Initialization
    async function initialize() {
        try {
            utils.log("Initializing Chaturbate DVR Script");
            
            try {
                // In a docker the system time can be something else, which affects the filenaming
                // This is to show the system time in status bar
                var data = JSON.parse( document.body.querySelector('#app-data-json')?.textContent.trim() )
                utils.log("init data: " , data)
                state.appInitDate = new Date( data.AppInitTs )
                state.webInitDate = new Date( data.WebInitTs )
                state.appInitTs = data.AppInitTs
                state.webInitTs = data.WebInitTs 
                state.timeOffset = state.webInitTs-Date.now();             
            }catch(err){
                utils.log("loading data from .app-data-json failed", err)
            }

            var clock = (function(){
                var clockEl = document.body.querySelector('#system-clock');
                var updatimeEl = document.body.querySelector('#uptime-info');
                setInterval(function(){
                    clockEl.textContent = utils.formatTime( new Date(Date.now() + state.timeOffset ) );
                    updatimeEl.textContent = "Uptime: " + utils.formatDuration( Date.now() - state.appInitTs ) ;
                    uptime-info
                },500)
            })()


            
            // Load channel data
            const channelsData = await api.getChannels();
            channelsData.forEach(chInfo => {
                const channel = channelManager.getChannel(chInfo.Username);
                channel.status = chInfo.IsPaused ? "PAUSED" :
                                chInfo.IsBlocked ? "BLOCKED" :
                                chInfo.IsDownPrioritized ? "QUEUED" :
                                chInfo.IsOnline ? "RECORDING" : "OFFLINE";
            });

            // Setup event handlers
            eventHandlers.setupSSE();
            eventHandlers.setupClickHandlers();
            eventHandlers.setupInputFilters();

            // Setup mouse tracking for sort delays
            document.body.addEventListener('mousemove', () => {
                state.lastUserMoved = Date.now();
            });

            // Save state on unload
            window.addEventListener("beforeunload", () => {
                sessionStorage.setItem("channels", JSON.stringify(state.channels));
            });

            // Initial updates
            setTimeout(() => {
                channelManager.updateCounters();
                Object.values(state.channels).forEach(ch => {
                    if (ch.thumbAnticache) {
                        eventHandlers.makeThumbnailUncached(ch.id, ch.thumbAnticache);
                    }
                });
            }, 500);

            // Setup periodic updates
            setInterval(() => channelManager.updateThroughput(), 1000);

            utils.log("Initialization complete");
            utils.log("State", state)
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
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
        channelManager: channelManager,
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
        getTrackedChannels: () => state.channels,
        debug: config.debug
    };

    // Start the application
    document.addEventListener("DOMContentLoaded", initialize);
    setTimeout(balloon,20)


})();


function balloon(){
    if(balloon.animating) return
    var el = document.body.querySelector('.lil-bandit-balloon');
    if( !balloon.ran ) {
        el.addEventListener("mouseover", balloon)
    }
    
    balloon.animating = true;
    const tl = gsap.timeline();
    el.classList.add("animating")
    tl.to(el, {y: -140,x: 350, scale:2,duration: balloon.ran ? 7:0, opacity: balloon.ran ? 1:0, rotation:55, ease: "power1.in"})
        .to(el, {y: 80, x: -150, opacity:0, duration: 0,  rotation:-55, onComplete:function(){ el.classList.remove("animating")}})
        .to(el, {y: 0,x: 0,duration: 12,opacity:.8,scale:1, rotation:0, ease: "elastic.out(.5,.5)",onComplete:function(){balloon.animating = false;}}); 
    balloon.ran = true    
}

