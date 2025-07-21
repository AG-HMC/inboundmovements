sap.ui.define([
    "inboundmovements/inboundmovements/controller/BaseController"
], (BaseController) => {
    "use strict";

    return BaseController.extend("inboundmovements.inboundmovements.controller.Putaway", {
        onInit() {},
        onButtonPress: function(source) {
            if (source === 'Assign Tasks') {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteList", {
                    source: source
                });
            } 
            else if(source === 'Assigned To Me'){
                 // Get CrossApplicationNavigation service
                //  if (this.getView().getModel("appName").getProperty("/name") === "Putaway")
                //     var action = "monitor";
                // else action = "track";
                // if (this.getView().getModel("appName").getProperty("/name") === "Putaway")
                    var action = "manage";
                // else action = "create";
                var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");

                var hash = (oCrossAppNav && oCrossAppNav.hrefForExternal({
                    target: {
                        semanticObject: "ZSCM_INTERNALMOVE",
                        action: action
                    },
                    params: {
                        appName: this.getView().getModel("appName").getProperty("/name"),
                        Assign: "Me"
                    }
                })) || "";
                oCrossAppNav.toExternal({
                    target: {
                        shellHash: hash
                    }
                });
            }
            
            else {
                // Get CrossApplicationNavigation service
                // if (this.getView().getModel("appName").getProperty("/name") === "Putaway")
                    var action = "manage";
                // else action = "create";
                var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");

                var hash = (oCrossAppNav && oCrossAppNav.hrefForExternal({
                    target: {
                        semanticObject: "ZSCM_INTERNALMOVE",
                        action: action
                    },
                    params: {
                        appName: this.getView().getModel("appName").getProperty("/name")
                    }
                })) || "";
                oCrossAppNav.toExternal({
                    target: {
                        shellHash: hash
                    }
                });


            }
        },

    });
});