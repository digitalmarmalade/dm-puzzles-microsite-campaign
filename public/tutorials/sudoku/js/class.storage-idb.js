var StorageIdb;

(function () {
  'use strict';

  StorageIdb = function (name, openRequest, settingsUser) {
    this.name = name;
    this.openRequest = openRequest;
    this.settingsUser = settingsUser || {};
    this.settingsMergeUserAndDefault();
    this.log('open');
    this.db = this.openRequest.result;
    if (!this.db.objectStoreNames.contains(name)) {
      this.db.createObjectStore(name, { keyPath: 'id' });
    }
  };
  StorageIdb.prototype.constructor = StorageIdb;

  StorageIdb.prototype.set = function (key, value) {
    if (key === undefined || value === undefined) {
      return false;
    }

    try {
      let transaction = this.db.transaction(this.name, 'readwrite');
      let store = transaction.objectStore(this.name);

      var obj = {
        id: key,
        data: JSON.stringify(value),
      };

      this.log('set', key, value);
      store.put(obj);
    } catch (error) {
      // DB connection may have been closed by a versionchange event from another tab
    }

    return true;
  };

  StorageIdb.prototype.get = function (key, convertToObject) {
    var self = this;

    return new Promise(function (resolve, reject) {
      if (key === undefined) {
        reject('No key defined');
      }

      try {
        let transaction = self.db.transaction(self.name, 'readwrite');
        let store = transaction.objectStore(self.name);

        var request = store.get(key);

        request.onsuccess = function (event) {
          var value = request.result && request.result.data ? JSON.parse(request.result.data) : null;
          self.log('get', key, value);
          resolve(value);
        };
      } catch (error) {
        // DB connection may have been closed by a versionchange event from another tab
        resolve(null);
      }
    });
  };

  StorageIdb.prototype.delete = function (key) {
    if (key === undefined) {
      return false;
    }

    try {
      let transaction = this.db.transaction(this.name, 'readwrite');
      let store = transaction.objectStore(this.name);
      store.delete(key);
    } catch (error) {
      // DB connection may have been closed by a versionchange event from another tab
    }

    return true;
  };

  StorageIdb.prototype.load = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
      try {
        let transaction = self.db.transaction(self.name, 'readwrite');
        let store = transaction.objectStore(self.name);

        var request = store.getAll();
        request.onsuccess = function (event) {
          var items = {};
          for (var i in request.result) {
            items[request.result[i].id] = JSON.parse(request.result[i].data);
          }
          resolve(items);
        };
        request.onerror = function (event) {
          reject(event);
        };
      } catch (error) {
        // DB connection may have been closed by a versionchange event from another tab
        resolve({});
      }
    });
  };

  StorageIdb.prototype.settingsMergeUserAndDefault = function () {
    this.settingsDefault = {
      debug: false,
      debugExclude: {
        get: [],
        set: [],
        open: [],
      },
    };
    this.settings = Object.assign(this.settingsDefault, this.settingsUser);
  };

  StorageIdb.prototype.log = function (action, key, value) {
    if (
      this.settings.debug &&
      (!this.settings.debugExclude[action] || this.settings.debugExclude[action].indexOf(key) < 0)
    ) {
      var itemsToLog = [];
      itemsToLog.push('idb:' + this.name);
      itemsToLog.push(action);
      key && itemsToLog.push(key);
      value && itemsToLog.push(value);
      console.log.apply(null, itemsToLog);
    }
  };
}());
