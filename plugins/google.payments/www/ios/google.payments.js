// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec'),
    iab = require('cc.fovea.plugins.inapppurchase.InAppPurchase'),
    Event = require('org.chromium.common.events'),
    billingAvailable,
    storeKitInitialized = false;

exports.onBillingAvailable = new Event('onBillingAvailable');
exports.onBillingUnavailable = new Event('onBillingUnavailable');
exports.billingAvailable = true;
 
function initializeStoreKit() {
    // Initialize StoreKit if we haven't already.
    if (!storeKitInitialized) {
        window.storekit.init({
            debug: true,
            purchase: function(transactionId, productId) {
                console.log('Purchased: ' + productId);
            },
            restore: function(transactionId, productId) {
                console.log('Restored: ' + productId);
            },
            restoreCompleted: function() {
               console.log('All restores complete.');
            },
            restoreFailed: function(errCode) {
                console.log('Restore failed with error: ' + errCode);
            },
            error: function(errno, errtext) {
                console.log('Error: ' + errtext);
            }
        });
        storeKitInitialized = true;
    }
}

// TODO(maxw): Consider storing this in local storage and preloading all previously-loaded items.
var loadedItemSet = {};

exports.inapp = {
    getSkuDetails: function(skus, success, failure) {
        // Initialize StoreKit, if necessary.
        initializeStoreKit();

        // Load the products to retrieve their information.
        window.storekit.load(skus, function(validProducts, invalidProductIds) {
            // Record the data for each valid product.
            var skuDetails = [];
            if (validProducts.length) {
                validProducts.forEach(function (i, product) {
                    // Add the valid product to the set of loaded items.
                    loadedItemSet[product.id] = true;
                    console.log("Loaded product: " + product.id);

                    // Add the item details to the list.
                    var item = {};
                    item.productId = product.id;
                    item.title = product.title
                    item.description = product.description;
                    item.price = product.price;
                    item.type = 0;
                    skuDetails.push(item);
                });
            }
            // Log all invalid products.
            if (invalidProductIds.length) {
                invalidProductIds.forEach(function (i, val) {
                    console.log("Invalid product id: " + val);
                });
            }
            // Pass the valid product details to the success callback.
            success(skuDetails);
        });
    },

    getPurchases: function(success, failure) {
        console.log('getPurchases');
    },

    buy: function(options) {
        // Initialize StoreKit, if necessary.
        initializeStoreKit();

        // We need to record whether the product to buy is valid.
        // This will be set to false if it's discovered that the given sku is invalid.
        var isValidProduct = true;

        // This function actually purchases the item.
        var purchaseItem = function() {
            // If the product is valid, buy it!
            if (isValidProduct) {
                // Set the purchase callback.
                window.storekit.options.purchase = function(transactionId, productId) {
                    options.success();
                };

                // Purchase the item!
                window.storekit.purchase(options.sku, 1);
            }
        }

        // First, we may need to load the item from the Apple Store.
        var sku = options.sku;
        if (!Object.prototype.hasOwnProperty.call(loadedItemSet, sku)) {
            var productIds = [sku];
            window.storekit.load(productIds, function(validProducts, invalidProductIds) {
                // If the product is valid, add it to the set of loaded items and purchase it.
                if (validProducts.length) {
                    loadedItemSet[sku] = true;
                    console.log("Loaded product: " + validProducts[0].id);
                    purchaseItem();
                }
                // If the product is invalid, note that.
                if (invalidProductIds.length) {
                    isValidProduct = false;
                    console.log("Invalid product: " + invalidProductIds[0]);
                }
            });
        } else {
            // If the item has already been previously loaded, we're safe to purchase it.
            purchaseItem();
        }
    }
};

