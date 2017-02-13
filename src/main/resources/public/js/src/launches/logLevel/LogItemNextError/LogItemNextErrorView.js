/*
 * Copyright 2016 EPAM Systems
 *
 *
 * This file is part of EPAM Report Portal.
 * https://github.com/epam/ReportPortal
 *
 * Report Portal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Report Portal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Report Portal.  If not, see <http://www.gnu.org/licenses/>.
 */
define(function (require, exports, module) {
    'use strict';

    var $ = require('jquery');
    var Backbone = require('backbone');
    var Epoxy = require('backbone-epoxy');
    var Util = require('util');
    var App = require('app');
    var LogItemNextErrorCollection = require('launches/logLevel/LogItemNextError/LogItemNextErrorCollection');
    var Localization = require('localization');
    var CallService = require('callService');
    var Urls = require('dataUrlResolver');
    var call = CallService.call;

    var config = App.getInstance();

    var LogItemNextErrorView = Epoxy.View.extend({
        template: 'tpl-launch-log-item-next-error',
        className: 'log-item-next-error',

        events: {
            'click [data-js-next-error]': 'onClickNextError',
        },

        bindings: {
            '[data-js-next-error]': 'attr: { disabled: disable}, classes: {load: load}'
        },

        computeds: {

        },
        initialize: function (options) {
            this.model = new Epoxy.Model({
                disable: false,
                load: true,
            });
            this.pagingModel = options.pagingModel;
            this.collectionLogs = options.collectionLogs;
            this.filterModel = options.filterModel;
            this.collection = new LogItemNextErrorCollection({filterModel: this.filterModel, itemModel: options.itemModel});
            this.currentLastPage = this.pagingModel.get('number');
            this.render();
            this.listenTo(this.filterModel, 'change:newSelectionParameters change:newEntities', this.onChangeFilter);
            this.listenTo(this.pagingModel, 'change', this.onChangePaging);
            this.onChangeFilter();
        },
        render: function () {
            this.$el.html(Util.templates(this.template, {}));
        },
        onClickNextError: function(e) {
            var self = this;
            if(!$(e.currentTarget).hasClass('load')) {
                var currentErrors = this.collectionLogs.where({level: 'ERROR'});
                if(currentErrors.length) {
                    var lastErrorId = currentErrors[currentErrors.length - 1].get('id');
                    var lastErrorNumber = -1;
                    _.each(this.collection.models, function(model, number) {
                        if(model.get('id') == lastErrorId) {
                            lastErrorNumber = number;
                            return false;
                        }
                    })
                    if(lastErrorNumber >= 0 && lastErrorNumber < this.collection.models.length -2) {
                        var logId = this.collection.models[lastErrorNumber + 1].get('id')
                        this.collectionLogs.findLogPage(logId)
                            .done(function(page) {
                                self.goToLog(page, logId);
                            })
                    }
                } else {

                }
            }
        },
        goToLog: function(page, logId) {
            this.collectionLogs.setPaging(page);
            var self = this;
            this.listenToOnce(this.collectionLogs, 'loading:false', function() {
                self.collectionLogs.get(logId) && self.collectionLogs.get(logId).trigger('scrollTo');
            });
        },
        onChangePaging: function() {
            this.checkPage();
        },
        checkPage: function() {
            if(this.pagingModel.get('number') >= this.currentLastPage) {
                this.model.set({disable: true});
            }else {
                this.model.set({disable: false});
            }
        },
        onChangeFilter: function() {
            var errorFilter = false;
            _.each(this.filterModel.getEntitiesObj(), function(field) {
                if(field.filtering_field == 'level' && (~field.value.search(/ERROR/) || field.value == '')) {
                    errorFilter = true;
                }
            });
            if (errorFilter) {
                this.model.set({disable: false, load: true});
                var self = this;
                this.collection.load()
                    .done(function() {
                        if(!self.collection.models.length) {
                           self.model.set({disable: true, load: false});
                           return;
                        }
                        self.collectionLogs.findLogPage(self.collection.models[self.collection.models.length -1].get('id'))
                            .done(function(page) {
                                self.currentLastPage = page;
                                self.model.set({load: false});
                                self.checkPage();
                            });
                    });
            } else {
                this.model.set({disable: true, load: false});
            }
        }
    });

    return LogItemNextErrorView;
});
