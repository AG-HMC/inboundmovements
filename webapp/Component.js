sap.ui.define([
    "sap/ui/core/UIComponent",
    "inboundmovements/inboundmovements/model/models",
    "sap/ui/model/json/JSONModel"
], (UIComponent, models, JSONModel) => {
    "use strict";

    return UIComponent.extend("inboundmovements.inboundmovements.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            var oComponentData = this.getComponentData();
            if (oComponentData && oComponentData.startupParameters) {
                var appName = oComponentData.startupParameters.appName?.[0];

                // Optionally pass it to the model or store for controller access
                this.setModel(new JSONModel({name: appName}), "appName");
                this.setModel(new JSONModel({AssignedResource : ""}), "assignmentModel");
                this.setModel(new JSONModel({List : []}), "messageModel");
            }

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});