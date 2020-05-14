console.log("PRAUXY Notifications Connected")
class PRAUXYNotification {
    constructor(appID, publicVapidKey) {
      this.appID = appID;
      this.publicVapidKey = publicVapidKey;
      this.canDoNotifications = 'serviceWorker' in navigator;
    }

    async register() {
      const registration = await navigator.serviceWorker.register('/prauxynotificationsw.js', {scope: '/'});
      return registration;
    }

    async subscribe(successCb, failCb) {
      const _this = this;
      const registration = await this.register();

      if(this.canDoNotifications) {
        const urlBase64ToUint8Array = (base64String) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
        
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }
      
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            // The `urlBase64ToUint8Array()` function is the same as in
            // https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
            applicationServerKey: urlBase64ToUint8Array(_this.publicVapidKey)
          });
      
        await fetch(`/${_this.appID}/subscribe`, {
          method: 'POST',
          body: JSON.stringify({
              subscription: subscription,
          }),
          headers: {
            'content-type': 'application/json'
          }
        }).then(data => {
          if(data.status == 200) {
            return Promise.resolve(data.json());
          } else {
            let error = {statusCode: data.status || data.statusCode || data.statusText, body: data.body}
            return Promise.reject(error)
          }
        }).then(r => {
          successCb(r);
        }).catch(e => failCb(e));
      } else {
        failCb("no service worker compatibility");
      }
    }
}