// Google Analytics Configuration
// Replace 'G-XXXXXXXXXX' with your actual Measurement ID

(function() {
    // Your Google Analytics Measurement ID
    const GA_MEASUREMENT_ID = 'G-QPLBD9120W';
    
    // Only load GA in production (not on localhost)
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1';
    
    if (!isProduction) {
        console.log('📊 Google Analytics disabled on localhost');
        return;
    }
    
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    
    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        dataLayer.push(arguments);
    }
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        // Anonymize IP addresses for privacy
        anonymize_ip: true,
        // Respect user's Do Not Track setting
        allow_google_signals: !navigator.doNotTrack || navigator.doNotTrack === '0'
    });
    
    console.log('📊 Google Analytics initialized');
})();

// Helper function to track custom events
window.trackEvent = function(eventName, eventParams = {}) {
    if (window.gtag) {
        window.gtag('event', eventName, eventParams);
        console.log('📊 Event tracked:', eventName, eventParams);
    }
};

// Helper function to track page views (for SPAs)
window.trackPageView = function(pagePath, pageTitle) {
    if (window.gtag) {
        window.gtag('event', 'page_view', {
            page_path: pagePath,
            page_title: pageTitle
        });
        console.log('📊 Page view tracked:', pagePath);
    }
};
