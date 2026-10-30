/**
The wrapper class for local storage.
**/

var DMStorage;

(function () {

    'use strict';

    /**
     * @constructor
     */
    DMStorage = function (prefix, type) {

        this.prefix = prefix || '';
        this.type = type || 'local';
        this.api = this.type === 'session' ? sessionStorage : localStorage;

    };
    DMStorage.prototype.constructor = DMStorage;

    DMStorage.prototype.set = function (key, value) {

        if (key === undefined || value === undefined) {
            return false;
        }

        this.api.setItem(this.getFullKey(key), JSON.stringify(value));

        return true;

    };

    DMStorage.prototype.get = function (key, convertToObject) {

        if (key === undefined) {
            return false;
        }

        var item = this.api.getItem(this.getFullKey(key));

        if (item === null) {
            return null;
        }

        if (convertToObject === true) {
            return typeof JSON.parse(item) === 'object' ? JSON.parse(item) : JSON.parse(JSON.parse(item));
        } else {
            return JSON.parse(item);
        }

    };

    DMStorage.prototype.delete = function (key) {

        if (key === undefined) {
            return false;
        }

        this.api.removeItem(this.getFullKey(key));

        return true;

    };

    DMStorage.prototype.getFullKey = function (key) {

        if (key === undefined) {
            return false;
        }

        return this.prefix + ':_' + key;

    };

}());
