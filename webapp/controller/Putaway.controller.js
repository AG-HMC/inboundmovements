sap.ui.define([
    "inboundmovements/inboundmovements/controller/BaseController"
], (BaseController) => {
    "use strict";

    return BaseController.extend("inboundmovements.inboundmovements.controller.Putaway", {
        onInit() {},

        // Handles button press actions based on the button text (source)
        onButtonPress: function(source) {
            // Case 1: Navigate to internal route within the app when 'Assign Tasks' is clicked
            if (source === 'Assign Tasks') {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this); // Get router instance
                oRouter.navTo("RouteList", {
                    source: source // Pass source as route parameter
                });
            } 

            // Case 2: Launch external app with parameters if 'Assigned To Me' is clicked
            else if(source === 'Assigned To Me'){
                 
                    var action = "manage";
                // else action = "create";

                // Get the CrossApplicationNavigation service
                var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");

                // Construct navigation hash to external app with parameters
                var hash = (oCrossAppNav && oCrossAppNav.hrefForExternal({
                    target: {
                        semanticObject: "ZSCM_INTERNALMOVE",
                        action: action
                    },
                    params: {
                        appName: this.getView().getModel("appName").getProperty("/name"),
                        Assign: "Me" // Indicate tasks assigned to current user
                    }
                })) || "";

                // Trigger the external navigation
                oCrossAppNav.toExternal({
                    target: {
                        shellHash: hash
                    }
                });
            }
            
            else {
                // Case 3: Generic navigation to the same external app without 'Assign' filter

                // Get CrossApplicationNavigation service
                // if (this.getView().getModel("appName").getProperty("/name") === "Putaway")
                    var action = "manage";
                // else action = "create";
                var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");

                // Build shell hash with only app name as parameter
                var hash = (oCrossAppNav && oCrossAppNav.hrefForExternal({
                    target: {
                        semanticObject: "ZSCM_INTERNALMOVE",
                        action: action
                    },
                    params: {
                        appName: this.getView().getModel("appName").getProperty("/name")
                    }
                })) || "";
                
                // Perform the navigation
                oCrossAppNav.toExternal({
                    target: {
                        shellHash: hash
                    }
                });


            }
        },

    });
});