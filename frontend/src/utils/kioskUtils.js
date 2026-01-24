export const isLocalhost = () => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
};

export const isKiosk = () => {
    return isLocalhost();
};
