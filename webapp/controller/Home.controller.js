sap.ui.define([
    "inboundmovements/inboundmovements/controller/BaseController",
    "sap/m/MessageToast"
], (BaseController, MessageToast) => {
    "use strict";

    return BaseController.extend("inboundmovements.inboundmovements.controller.Home", {
        onInit() {
            try {
                // Get router and attach route matched handler
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

        // Called when the route is matched
        _onRouteMatched: function(oEvent) {
            try {
                var obj = this._oComponent.getModel("globalDataModel").getData();
                obj.Source = oEvent.getParameter('arguments').source;
                this._oComponent.getModel("globalDataModel").refresh(true);
            } catch (e) {
                this.handleException(e);
            }
        },
        
        // This is event is triggered on the button
        onButtonPress: function(source) {
            if (source === 'Putaway' || source === 'Picking') {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RoutePutaway", {
                    // target: source
                });
            } else {
                MessageToast.show("Not implemented");
            }
        }
    });
});