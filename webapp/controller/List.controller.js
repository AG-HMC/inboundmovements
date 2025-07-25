sap.ui.define([
    "inboundmovements/inboundmovements/controller/BaseController",
    "sap/ndc/BarcodeScanner",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
], (BaseController, BarcodeScanner, Filter, FilterOperator, Fragment, MessageBox, BusyIndicator) => {
    "use strict";

    return BaseController.extend("inboundmovements.inboundmovements.controller.List", {
        // Called when the controller is initialized
        onInit() {
            try {
                // Get the router instance from the component and attach route match handler
                this.oRouter = this.getOwnerComponent().getRouter();
                this.oRouter.attachRouteMatched(this._onRouteMatched, this);
                // Get reference to the current view
                this._oView = this.getView();
                // Get reference to the component owning this view
                this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this._oView));
            } catch (e) {
                this.handleException(e);
            }
        },

         // Triggered when route is matched (navigated to this view)
        _onRouteMatched: function(oEvent) {
            try {
                // Extract and set source from route arguments into the global data model
                var obj = this._oComponent.getModel("globalDataModel").getData();
                obj.Source = oEvent.getParameter('arguments').source;
                this._oComponent.getModel("globalDataModel").refresh(true);
                var that = this;
                // Load and cache the table item fragment for later binding
                var that = this;
                Fragment.load({
                    name: "inboundmovements.inboundmovements.view.fragments.TabelTemplate",
                    controller: this
                }).then(function(oTemplate) {
                    that._oTableItemTemplate = oTemplate;
                });
                // Fetch user default values (e.g., default warehouse)
                this._fetchDefaultValues.bind(this)();
            } catch (e) {
                this.handleException(e);
            }
        },

         // Triggered when barcode scan button is pressed
        onScanPress: function() {
                       try {
                var that = this;
            // Initiate barcode scanning
                BarcodeScanner.scan(
                    function(oResult) {
                        if (!oResult.cancelled) {
                            // Map of identifier prefixes to field names
                            const appIdMap = {
                                "240": "PROD",
                                "00": "HU",
                                "Q04": "DST",
                                "Q05": "DSB",
                                "10": "BATCH"
                            };
            
                            // Sort keys by descending length to match longest prefix first
                            const sortedKeys = Object.keys(appIdMap).sort((a, b) => b.length - a.length);
            
                            // Identify the field and value based on barcode/QR code prefix
                            function getFieldByAppIdentifier(inputText) {
                                for (const key of sortedKeys) {
                                    if (inputText.startsWith(key)) {
                                        return {
                                            field: appIdMap[key],
                                            value: inputText.slice(key.length)
                                        };
                                    }
                                }
                                return null;
                            }
            
                            // Split the scanned text by '#' and process each part
                            const parts = oResult.text.split('#');
                            for (const part of parts) {
                                const parsed = getFieldByAppIdentifier(part);
                                if (parsed) {
                                    this._validateInputValue(parsed.field, parsed.value);
                                } else {
                                    // Handle invalid parts (optional)
                                    console.warn("Unrecognized scanned part: " + part);
                                }
                            }
                        }
                    }.bind(this),
                    function(oError) {
                        // Handle scan errors
                        sap.m.MessageToast.show("Scan failed: " + oError);
                    }
                );
            } catch (e) {
                this.handleException(e);
            }
        },

        // Triggers the search using filters in HeaderFilter
        onSearch: function() {
            try {
                var oTable = this.byId("putawayTable"),
                    aFilter = [],
                    oFilter = {},
                    oTemplate = this._oTableItemTemplate;
                var obj = this._oComponent.getModel("globalDataModel").getData();

                // Show error if warehouse is not selected
                if (!obj.HeaderFilter.WarehouseNumber) {
                    var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                    MessageBox.error(
                        this._getText("WHMandatory"), {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        }
                    );
                    return;
                }

                // Create filters based on header filter fields
                if (obj.HeaderFilter.WarehouseNumber) {
                    oFilter = new Filter("WarehouseNumber", FilterOperator.EQ, obj.HeaderFilter.WarehouseNumber);
                    aFilter.push(oFilter);
                }
                if (obj.HeaderFilter.StorageType) {
                    oFilter = new Filter("DestinationStorageType", FilterOperator.EQ, obj.HeaderFilter.StorageType);
                    aFilter.push(oFilter);
                }
                if (obj.HeaderFilter.StorageBin) {
                    oFilter = new Filter("DestinationStorageBin", FilterOperator.EQ, obj.HeaderFilter.StorageBin);
                    aFilter.push(oFilter);
                }
                if (obj.HeaderFilter.Product) {
                    oFilter = new Filter("Product", FilterOperator.EQ, obj.HeaderFilter.Product);
                    aFilter.push(oFilter);
                }
                if (obj.HeaderFilter.HandlingUnit) {
                    oFilter = new Filter("SourceHandlingUnit", FilterOperator.EQ, obj.HeaderFilter.HandlingUnit);
                    aFilter.push(oFilter);
                }
                if (obj.HeaderFilter.StockType) {
                    oFilter = new Filter("StockType", FilterOperator.EQ, obj.HeaderFilter.StockType);
                    aFilter.push(oFilter);
                }
                if (obj.HeaderFilter.Batch) {
                    oFilter = new Filter("Batch", FilterOperator.EQ, obj.HeaderFilter.Batch);
                    aFilter.push(oFilter);
                }
                if (obj.HeaderFilter.Resource) {
                    oFilter = new Filter("ExecutingResource", FilterOperator.EQ, obj.HeaderFilter.Resource);
                    aFilter.push(oFilter);
                }

                // Add filter for WarehouseProcessCategory based on app name
                if (this.getView().getModel('appName')) {
                    if (this.getView().getModel('appName').getProperty('/name') === 'Putaway') {
                        oFilter = new Filter("WarehouseProcessCategory", FilterOperator.EQ, '1');
                    } else
                        oFilter = new Filter("WarehouseProcessCategory", FilterOperator.EQ, '2');
                    aFilter.push(oFilter);
                }

                // Bind items to the table using filters and template
                oTable.bindItems({
                    path: "/FetchPutAway",
                    template: oTemplate,
                    filters: aFilter
                });

                // Clear any old list messages
                this.getView().getModel("messageModel").setProperty("/List", []);
            } catch (e) {
                this.handleException(e);
            }
        },

        // Fetch user-specific default values (like default warehouse)
        _fetchDefaultValues: function() {
            try {
                
                var path = this._oComponent.getModel('defaultValueModel').createKey("/PersContainers", {
                    category: 'P',
                    id: 'sap.ushell.UserDefaultParameter'
                });

                // Read user default parameters from model
                this._oComponent.getModel('defaultValueModel').read(path, {
                    urlParameters: {
                        "$expand": "PersContainerItems"
                    },
                    success: function(data) {
                        if (data) {
                            if (data.PersContainerItems.results.length > 0) {
                                if (data.PersContainerItems.results.filter(item => item.id === "Warehouse").length > 0) {
                                    var obj = this._oComponent.getModel("globalDataModel").getData();
                                    obj.HeaderFilter.WarehouseNumber = JSON.parse(data.PersContainerItems.results.filter(item => item.id === "Warehouse")[0].value).value;
                                    this._oComponent.getModel("globalDataModel").refresh(true);
                                    this.onSearch.bind(this)();
                                }
                            }
                        }
                    }.bind(this),
                    error: function(error) {

                    }.bind(this)
                });
            } catch (e) {
                this.handleException(e);
            }
        },

        // Filters the value help dialog based on the user input and filter context
        onValueHelpSearch: function(oEvent, source) {
            try {
                const searchText = oEvent.getParameter("value");
                const obj = this._oComponent.getModel("globalDataModel").getData();
                const headerFilter = obj.HeaderFilter || {};
                const filterList = [];

                // Predefined filter configurations for each source
                const filterConfig = {
                    'WH': {
                        searchFields: ["WarehouseNumber", "WarehouseNumber_Text"],
                        additionalFilters: []
                    },
                    'DST': {
                        searchFields: ["StorageType", "StorageType_Text"],
                        additionalFilters: ["WarehouseNumber"]
                    },
                    'DSB': {
                        searchFields: ["StorageBin"],
                        additionalFilters: ["WarehouseNumber", "StorageType"]
                    },
                    'HU': {
                        searchFields: ["HandlingUnitNumber", "HandlingUnitType_Text"],
                        additionalFilters: ["WarehouseNumber", "StorageType", "StorageBin"]
                    },
                    'PROD': {
                        searchFields: ["Product", "Product_Text"],
                        additionalFilters: ["WarehouseNumber", "StorageType", "StorageBin"]
                    },
                    'BATCH': {
                        searchFields: ["Batch"],
                        additionalFilters: ["WarehouseNumber", "StorageType", "StorageBin", "Product"]
                    },
                    'Stock Type': {
                        searchFields: ["StockType", "StockTypeText"],
                        additionalFilters: ["WarehouseNumber"]
                    },
                    'Stock Type Target': {
                        searchFields: ["StockType", "StockTypeText"],
                        additionalFilters: ["WarehouseNumber"]
                    },
                    'RESOURCE': {
                        searchFields: ["RSRC_TYPE", "RSRC"],
                        additionalFilters: ["WarehouseNumber"]
                    }
                };

                // Create search field filters
                const config = filterConfig[source];
                if (!config) return;

                // OR logic for search fields
                const searchFilters = config.searchFields.map(field =>
                    new Filter(field, FilterOperator.Contains, searchText)
                );
                const orSearchFilter = new Filter({
                    filters: searchFilters,
                    and: false // OR logic
                });

                // AND logic for additional (contextual) filters
                const additionalFilters = config.additionalFilters
                    .map(field => {
                        const value = headerFilter[field];
                        return value ? new Filter(field, FilterOperator.EQ, value) : null;
                    })
                    .filter(Boolean); // Remove nulls

                // Combine: (searchFields OR ...) AND (contextual AND ...)
                const finalFilters = [
                    orSearchFilter,
                    ...additionalFilters
                ];

                const combinedFilter = new Filter({
                    filters: finalFilters,
                    and: true // All combined using AND
                });

                // Apply filter to value help dialog's item binding
                this._valueHelpDialog
                    .getAggregation('_dialog')
                    .getContent()[1]
                    .getBinding('items')
                    .filter([combinedFilter]);
            } catch (e) {
                this.handleException(e);
            }
        },

        // Called when a value is selected in value help dialog
        onValueHelpConfirm: function(oEvent, source) {
            try {
                var obj = this._oComponent.getModel("globalDataModel").getData();

                // Update HeaderFilter based on selected value and source type
                switch (source) {
                    case 'WH':
                        obj.HeaderFilter.WarehouseNumber = oEvent.getParameter("selectedItem").getTitle();
                        // Clear other dependent fields
                        obj.HeaderFilter = Object.fromEntries(
                            Object.entries(obj.HeaderFilter).filter(([key]) => key === 'WarehouseNumber')
                        );
                        break;
                    case 'PROD':
                        obj.HeaderFilter.Product = oEvent.getParameter("selectedItem").getTitle();
                        break;
                    case 'DSB':
                        obj.HeaderFilter.StorageBin = oEvent.getParameter("selectedItem").getTitle();
                        break;
                    case 'HU':
                        obj.HeaderFilter.HandlingUnit = oEvent.getParameter("selectedItem").getTitle();
                        break;
                    case 'DST':
                        obj.HeaderFilter.StorageType = oEvent.getParameter("selectedItem").getTitle();
                        break;
                    case 'Stock Type':
                        obj.HeaderFilter.StockType = oEvent.getParameter("selectedItem").getTitle();
                        break;
                    case 'Stock Type Target':
                        obj.TargetData.StockType = oEvent.getParameter("selectedItem").getTitle();
                        break;
                    case 'BATCH':
                        obj.HeaderFilter.Batch = oEvent.getParameter("selectedItem").getTitle();
                        break;
                    case 'RESOURCE':
                        obj.HeaderFilter.Resource = oEvent.getParameter("selectedItem").getTitle();
                        break;
                    case 'RESOURCE_A':
                        this.getView().getModel('assignmentModel').setProperty("/AssignedResource", oEvent.getParameter("selectedItem").getTitle());
                        break;
                }

                // Trigger UI refresh and search for all except RESOURCE_A
                if (source !== 'RESOURCE_A') {
                    this._oComponent.getModel("globalDataModel").refresh(true);
                    this._handleFilterClear.bind(this)(source);
                    this.onSearch.bind(this)();
                }
            } catch (e) {
                this.handleException(e);
            }
        },

        // Clears dependent fields when a parent field is updated
        _handleFilterClear: function(source) {
            try {
                var obj = this._oComponent.getModel("globalDataModel").getData();
                switch (source) {
                    case 'PROD':
                        // Clear Batch when Product changes
                        obj.HeaderFilter.Batch = "";
                        break;
                    case 'DSB':
                        // Clear fields when Destination Storage Bin changes
                        obj.HeaderFilter.Batch = "";
                        obj.HeaderFilter.HandlingUnit = "";
                        obj.HeaderFilter.Product = "";
                        break;
                    case 'StorageBin':
                        // Clear HU, Batch, and Product when StorageBin changes
                        obj.HeaderFilter.Batch = "";
                        obj.HeaderFilter.HandlingUnit = "";
                        obj.HeaderFilter.Product = "";
                        break;
                    case 'HU':
                        break;
                    case 'DST':
                        // Clear Bin, HU, Batch, and Product when Destination StorageType changes
                        obj.HeaderFilter.Batch = "";
                        obj.HeaderFilter.HandlingUnit = "";
                        obj.HeaderFilter.Product = "";
                        obj.HeaderFilter.StorageBin = "";
                        break;
                    case 'Stock Type':
                        break;
                    case 'BATCH':
                        break;
                }
                this._oComponent.getModel("globalDataModel").refresh(true);
            } catch (e) {
                this.handleException(e);
            }
        },

        // Validates scanned input and updates the HeaderFilter accordingly
        _validateInputValue: function(source, text) {
            try {
                const obj = this._oComponent.getModel("globalDataModel").getData();

                // Define configuration for each source type
                const filterConfig = {
                    'PROD': {
                        path: "/ZSCM_I_ProductVH",
                        key: "Product",
                        filterKey: "Product",
                        additionalFilters: ["WarehouseNumber", "StorageType", "StorageBin"]
                    },
                    'DSB': {
                        path: "/ZSCM_I_StorageBinVH",
                        key: "StorageBin",
                        filterKey: "StorageBin",
                        additionalFilters: ["WarehouseNumber", "StorageType"]
                    },
                    'HU': {
                        path: "/ZSCM_I_HandlingUnitTypeVH",
                        key: "HandlingUnitNumber",
                        filterKey: "HandlingUnit",
                        additionalFilters: ["WarehouseNumber", "StorageType", "StorageBin"]
                    },
                    'BATCH': {
                        path: "/ZSCM_I_PhysStkBatchVH",
                        key: "Batch",
                        filterKey: "Batch",
                        additionalFilters: ["WarehouseNumber", "StorageType", "StorageBin", "Product"]
                    },
                    'DST': {
                        path: "/ZSCM_I_StorageTypeVH",
                        key: "StorageType",
                        filterKey: "StorageType",
                        additionalFilters: ["WarehouseNumber"]
                    }
                };

                // If no config or path, treat as direct assignment (for WH)
                const config = filterConfig[source];
                if (!config || !config.path) {
                    if (source === 'WH') {
                        obj.HeaderFilter.WarehouseNumber = text;
                        this._oComponent.getModel("globalDataModel").refresh(true);
                        this.onSearch();
                    }
                    return;
                }

                // Build filters for validation request
                const filterList = [new Filter(config.key, FilterOperator.EQ, text)];

                // Add additional filters from HeaderFilter context
                config.additionalFilters.forEach(field => {
                    const value = obj.HeaderFilter[field];
                    if (value) {
                        filterList.push(new Filter(field, FilterOperator.EQ, value));
                    }
                });

                const that = this;

                // Promise to validate scanned input via OData call
                const validateScan = () => {
                    return new Promise((resolve, reject) => {
                        that._validateScanValue(config.path, filterList, resolve, reject, this._getText("incorrectScan"));
                    });
                };

                // On successful validation, update HeaderFilter and refresh
                const onSuccess = () => {
                    obj.HeaderFilter[config.filterKey] = text;
                    that._oComponent.getModel("globalDataModel").refresh(true);
                    // that._handleFilterClear.bind(this)(config.filterKey);
                    that.onSearch();
                };

                // On failed validation, clear the field and search again
                const onError = () => {
                    obj.HeaderFilter[config.filterKey] = '';
                    // that._oComponent.getModel("globalDataModel").refresh(true);
                    that.onSearch();
                };

                validateScan().then(onSuccess).catch(onError);
            } catch (e) {
                this.handleException(e);
            }
        },

        // Triggered when Assign button is clicked
        onAssignPress: function() {
            try {
                // Clear previous selection
                this.getView().getModel('assignmentModel').setProperty("/AssignedResource", "");

                // Show warning if nothing is selected
                if (this.byId('putawayTable').getSelectedItems().length === 0) {
                    var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                    MessageBox.warning(
                        this._getText("NoItemAssignWarning"), {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        }
                    );
                    return;
                }

                // Load and open the assign resource dialog
                if (!this._assignDialog) {
                    this._assignDialog = sap.ui.xmlfragment("inboundmovements.inboundmovements.view.fragments.AssignResorce", this);
                    this.getView().addDependent(this._assignDialog);
                }
                this._assignDialog.open();
                this.getView().getModel("messageModel").setProperty("/List", []);
            } catch (e) {
                this.handleException(e);
            }
        },

        // Cancels resource assignment dialog
        onCancelAssignReource: function() {
            try {
                this._assignDialog.close();

            } catch (e) {
                this.handleException(e);
            }
        },

        // Assigns selected warehouse tasks to the current user
        onAssignToMe: async function() {
            try {
                var oTable = this.byId("putawayTable");

                // Get selected items
                var aSelectedItems = oTable.getSelectedItems();


                // Array to hold selected item data
                var aSelectedData = [];

                // Loop through selected items and get their binding context data
                aSelectedItems.forEach(function(oItem) {
                    var oContext = oItem.getBindingContext();
                    if (oContext) {
                        aSelectedData.push(oContext.getObject());
                    }
                });

                // Set AssignedResource to actual user or default if not available
                if (sap.ushell.Container.getService("UserInfo").getId() !== 'DEFAULT_USER')
                    this.getView().getModel('assignmentModel').setProperty("/AssignedResource", sap.ushell.Container.getService("UserInfo").getId());
                else
                    this.getView().getModel('assignmentModel').setProperty("/AssignedResource", 'SAURAVC');
                
                // Fetch queue value for assignment
                const queueValue = await this._fetchQueueValue.bind(this)(aSelectedData[0].WarehouseNumber);

                const aResults = [];
                
                // Process each selected item sequentially
                for (const item of aSelectedData) {
                    const result = await processItem.call(this, item, queueValue);
                    aResults.push(result);
                }

                // Process assignment logic for a single item
                async function processItem(item, queueValue) {
                    try {
                        // Step 1: Assign Queue to warehouse order
                        const assignRes = await this._assignQueue(item.WarehouseNumber, item.WarehouseOrder, queueValue);
                        const sToken = assignRes['Token'];
                        const etag = assignRes['Etag'];

                        // Step 2: Update the warehouse order queue
                        const updateRes = await this._updateQueue(
                            item.WarehouseNumber,
                            item.WarehouseOrder,
                            queueValue,
                            sToken,
                            etag
                        );

                       

                        // Step 3: If resource is already assigned, unassign it first

                        if(item.ExecutingResource !== 'Not Assigned'){
                            const tokenRes = await this._fetchEtagAndTokenForResouceAssignment(
                                item.WarehouseNumber,
                                item.WarehouseOrder
                            );
                            const sResToken = tokenRes['Token'];
                            const eRestag = tokenRes['Etag'];
                            
                            await this._unassignWarehouseResource(
                                item.WarehouseNumber,
                                item.WarehouseOrder,
                                sResToken,
                                eRestag
                            );

                           
                            
                        }

                        // Step 4: Fetch token and etag for assigning new resource
                        const tokenRes = await this._fetchEtagAndTokenForResouceAssignment(
                            item.WarehouseNumber,
                            item.WarehouseOrder
                        );
                        const sResToken = tokenRes['Token'];
                        const eRestag = tokenRes['Etag'];
                        
                        
                        // Step 5: Logon to warehouse resource
                        const logonRes = await this._logonToWarehouseResource(
                            item.WarehouseNumber,
                            // item.WarehouseOrder,
                            sResToken
                            // eRestag
                        );

                        // Step 6: Assign resource to warehouse order
                        const assignResourceRes = await this._assignResouce(
                            item.WarehouseNumber,
                            item.WarehouseOrder,
                            sResToken,
                            eRestag
                        );

                        // Step 7: Logoff from warehouse resource
                        const logoffRes = await this._logonOffWarehouseResource(
                            item.WarehouseNumber,
                            sResToken
                        );

                        return {
                            order: item.WarehouseOrder,
                            text: logoffRes?.text || "Success",
                            fullResponse: logoffRes,
                            failed: false,
                            type: 'Success',
                            title: item.WarehouseOrder + "/" + item.WarehouseTask + " - was submitted successfully",
                            description: "Successfully assigned \n WarehouseOrder : " + item.WarehouseOrder + " \n WarehouseTask : " + item.WarehouseTask
                        };
                    } catch (error) {
                        return {
                            order: item.WarehouseOrder,
                            text: "Assignment failed",
                            fullResponse: error,
                            failed: true,
                            type: 'Error',
                            title: item.WarehouseOrder + "/" + item.WarehouseTask + " - " + error,
                            description: "Failed to assigned \n WarehouseOrder : " + item.WarehouseOrder + " \n WarehouseTask : " + item.WarehouseTask + " \n Reason : " + error
                        };
                    }
                }
                console.log(aResults);
                this.getView().getModel("messageModel").setProperty("/List", aResults);
                // Close dialog if no errors
                if (aResults.filter(item => item.failed === true).length === 0)
                    this._assignDialog.close();
                // Show result messages
                this._handleMessageView.bind(this)();
                BusyIndicator.hide();
               
            } catch (e) {
                this.handleException(e);
            }
        },

        // Assign selected warehouse tasks to the user defined in the assignmentModel
        onAssign: async function() {
            try {
                // Check if a resource has been selected
                if (!this.getView().getModel('assignmentModel').getProperty("/AssignedResource")) {
                    // Show a warning message if no resource is selected
                    var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                    MessageBox.warning(
                        this._getText("NoResourceWarning"), {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        }
                    );
                    return;
                }
                var oTable = this.byId("putawayTable");

                // Get selected items
                var aSelectedItems = oTable.getSelectedItems();


                // Collect data from each selected row
                var aSelectedData = [];

                // Loop through selected items and get their binding context data
                aSelectedItems.forEach(function(oItem) {
                    var oContext = oItem.getBindingContext();
                    if (oContext) {
                        aSelectedData.push(oContext.getObject());
                    }
                });

                // Get queue value based on the warehouse number of the first selected item
                const queueValue = await this._fetchQueueValue.bind(this)(aSelectedData[0].WarehouseNumber);
                const aResults = [];
               
                // Loop over selected items and assign each one
                for (const item of aSelectedData) {
                    const result = await processItem.call(this, item, queueValue);
                    aResults.push(result);
                }

                // Function to handle assignment for one item
                async function processItem(item, queueValue) {
                    try {
                        // Step 1: Assign queue to warehouse order
                        const assignRes = await this._assignQueue(item.WarehouseNumber, item.WarehouseOrder, queueValue);
                        const sToken = assignRes['Token'];
                        const etag = assignRes['Etag'];

                        // Step 2: Update the warehouse order with the assigned queue
                        const updateRes = await this._updateQueue(
                            item.WarehouseNumber,
                            item.WarehouseOrder,
                            queueValue,
                            sToken,
                            etag
                        );

                        // Step 3: If a resource is already assigned, unassign it
                        
                        if(item.ExecutingResource !== 'Not Assigned'){
                            
                            const tokenRes = await this._fetchEtagAndTokenForResouceAssignment(
                                item.WarehouseNumber,
                                item.WarehouseOrder
                            );
                            const sResToken = tokenRes['Token'];
                            const eRestag = tokenRes['Etag'];

                            await this._unassignWarehouseResource(
                                item.WarehouseNumber,
                                item.WarehouseOrder,
                                sResToken,
                                eRestag
                            );
                            
                        }

                        // Fetch new token and etag for assigning the new resource
                        const tokenRes = await this._fetchEtagAndTokenForResouceAssignment(
                            item.WarehouseNumber,
                            item.WarehouseOrder
                        );
                        const sResToken = tokenRes['Token'];
                        const eRestag = tokenRes['Etag'];

                        // Step 4: Log on to warehouse resource

                        const logonRes = await this._logonToWarehouseResource(
                            item.WarehouseNumber,
                            // item.WarehouseOrder,
                            sResToken
                            // eRestag
                        );

                        // Step 5: Assign selected resource to warehouse order
                        const assignResourceRes = await this._assignResouce(
                            item.WarehouseNumber,
                            item.WarehouseOrder,
                            sResToken,
                            eRestag
                        );

                        // Step 6: Log off from warehouse resource
                        const logoffRes = await this._logonOffWarehouseResource(
                            item.WarehouseNumber,
                            sResToken
                        );

                        // Return success result
                        return {
                            order: item.WarehouseOrder,
                            text: logoffRes?.text || "Success",
                            fullResponse: logoffRes,
                            failed: false,
                            type: 'Success',
                            title: item.WarehouseOrder + "/" + item.WarehouseTask + " - was submitted successfully",
                            description: "Successfully assigned \n WarehouseOrder : " + item.WarehouseOrder + " \n WarehouseTask : " + item.WarehouseTask
                        };
                    } catch (error) {
                        return {
                            order: item.WarehouseOrder,
                            text: "Assignment failed",
                            fullResponse: error,
                            failed: true,
                            type: 'Error',
                            title: item.WarehouseOrder + "/" + item.WarehouseTask + " - " + error,
                            description: "Failed to assigned \n WarehouseOrder : " + item.WarehouseOrder + " \n WarehouseTask : " + item.WarehouseTask + " \n Reason : " + error
                        };
                    }
                }
                console.log(aResults);
                // Display assignment result messages
                this.getView().getModel("messageModel").setProperty("/List", aResults);

                // Close dialog if no errors occurred
                if (aResults.filter(item => item.failed === true).length === 0)
                    this._assignDialog.close();
                // Show message dialog
                this._handleMessageView.bind(this)();
                BusyIndicator.hide();

            } catch (e) {
                this.handleException(e);
            }
        },

        // Opens the message (error/success) view
        _handleMessageView: function() {
            if (!this._errorDialog) {
                this._errorDialog = sap.ui.xmlfragment("inboundmovements.inboundmovements.view.fragments.ErrorDialog",
                    this);
                this.getView().addDependent(this._errorDialog);
            }

            this._errorDialog.open();
        },

        // Called when an item in the error dialog is selected
        onItemSelect: function() {
            sap.ui.getCore().byId("backButton").setVisible(true);
        },

        // Navigates back in the error dialog and hides the back button
        onBackPress: function() {
            this._errorDialog.getContent()[0].navigateBack();
            sap.ui.getCore().byId("backButton").setVisible(false);
        },

        // Closes the error dialog and triggers a search if there were no failed assignments
        onErrorDialogClose: function() {
            this._errorDialog.close();
            const list = this.getView().getModel("messageModel").getProperty("/List");
            const failedCount = list.filter(item => item.failed === true).length;
            // If all assignments succeeded, refresh the search
        if (failedCount === 0)
            this.onSearch.bind(this)();
        },

        // Controls visibility of footer based on error presence
        handleFooterVisibility: function(List) {
            if (List) {
                if (List.filter(item => item.failed === true).length > 0)
                    return true;
                else
                    return false;
            } else
                return false;
        },

        // Returns the number of failed assignments in the list
        handleErrorCount: function(List) {
            if (List)
                return List.filter(item => item.failed === true).length;
            else
                return 0;
        }
    });
});