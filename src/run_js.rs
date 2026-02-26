use deno_core::{error::AnyError, Extension, FastString, OpDecl, PollEventLoopOptions};

/// Bootstrap JavaScript that sets up timer globals (setTimeout, setInterval, etc.)
const TIMER_BOOTSTRAP: &str = r#"
(() => {
    // Timer callback registry
    const timerCallbacks = new Map();
    
    // setTimeout implementation
    globalThis.setTimeout = (callback, delay = 0, ...args) => {
        const timerId = Deno.core.ops.op_timerStart();
        timerCallbacks.set(timerId, { callback, args, cleared: false });
        
        // Schedule the async wait
        (async () => {
            const completed = await Deno.core.ops.op_timerWait(timerId, delay);
            const timer = timerCallbacks.get(timerId);
            timerCallbacks.delete(timerId);
            if (completed && timer && !timer.cleared) {
                timer.callback(...timer.args);
            }
        })();
        
        return timerId;
    };
    
    // clearTimeout implementation
    globalThis.clearTimeout = (timerId) => {
        const timer = timerCallbacks.get(timerId);
        if (timer) {
            timer.cleared = true;
        }
        Deno.core.ops.op_timerCancel(timerId);
    };
    
    // setInterval implementation
    globalThis.setInterval = (callback, delay = 0, ...args) => {
        let active = true;
        let currentTimerId;
        
        const scheduleNext = async () => {
            while (active) {
                currentTimerId = Deno.core.ops.op_timerStart();
                const completed = await Deno.core.ops.op_timerWait(currentTimerId, delay);
                if (completed && active) {
                    callback(...args);
                } else {
                    break;
                }
            }
        };
        
        // Start the interval loop
        scheduleNext();
        
        // Return an object that tracks the interval
        // We use a unique ID for clearInterval
        const intervalId = Deno.core.ops.op_timerStart();
        timerCallbacks.set(intervalId, { 
            type: 'interval',
            cancel: () => { 
                active = false; 
                if (currentTimerId !== undefined) {
                    Deno.core.ops.op_timerCancel(currentTimerId);
                }
            } 
        });
        
        return intervalId;
    };
    
    // clearInterval implementation
    globalThis.clearInterval = (intervalId) => {
        const interval = timerCallbacks.get(intervalId);
        if (interval && interval.type === 'interval') {
            interval.cancel();
            timerCallbacks.delete(intervalId);
        }
    };
})();
"#;

pub async fn run_js(js: &str, ops: Vec<OpDecl>) -> Result<(), AnyError> {
    let ext = Extension {
        ops: std::borrow::Cow::Owned(ops),
        ..Default::default()
    };
    
    let mut js_runtime = deno_core::JsRuntime::new(deno_core::RuntimeOptions {
        extensions: vec![ext],
        ..Default::default()
    });

    // Execute timer bootstrap first to set up setTimeout/setInterval globals
    js_runtime.execute_script("[funee:timers.js]", TIMER_BOOTSTRAP)?;
    
    // Then execute user code
    let js_code: FastString = js.to_string().into();
    js_runtime.execute_script("[funee:runtime.js]", js_code)?;
    js_runtime.run_event_loop(PollEventLoopOptions::default()).await?;

    Ok(())
}
