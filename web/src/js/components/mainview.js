var React = require("react");

var common = require("./common.js");
var actions = require("../actions.js");
var Query = require("../actions.js").Query;
var toputils = require("../utils.js");
var views = require("../store/view.js");
var Filt = require("../filt/filt.js");
FlowTable = require("./flowtable.js");
var FlowView = require("./flowview/index.js");

var MainView = React.createClass({
    mixins: [common.Navigation, common.RouterState],
    contextTypes: {
        flowStore: React.PropTypes.object.isRequired,
    },
    childContextTypes: {
        returnFocus: React.PropTypes.func.isRequired,
        view: React.PropTypes.object.isRequired,
    },
    getChildContext: function () {
        return {
            returnFocus: this.returnFocus,
            view: this.state.view
        };
    },
    returnFocus: function () {
        this.getDOMNode().focus();
    },
    getInitialState: function () {
        var sortKeyFun = false;
        var view = new views.StoreView(this.context.flowStore, this.getViewFilt(), sortKeyFun);
        view.addListener("recalculate", this.onRecalculate);
        view.addListener("add", this.onUpdate);
        view.addListener("update", this.onUpdate);
        view.addListener("remove", this.onUpdate);
        view.addListener("remove", this.onRemove);

        return {
            view: view,
            sortKeyFun: sortKeyFun
        };
    },
    componentWillUnmount: function () {
        this.state.view.close();
    },
    getViewFilt: function () {
        try {
            var filt = Filt.parse(this.getQuery()[Query.FILTER] || "");
            var highlightStr = this.getQuery()[Query.HIGHLIGHT];
            var highlight = highlightStr ? Filt.parse(highlightStr) : false;
        } catch (e) {
            console.error("Error when processing filter: " + e);
        }

        return function filter_and_highlight(flow) {
            if (!this._highlight) {
                this._highlight = {};
            }
            this._highlight[flow.id] = highlight && highlight(flow);
            return filt(flow);
        };
    },
    componentWillReceiveProps: function (nextProps) {
        var filterChanged = (this.props.query[Query.FILTER] !== nextProps.query[Query.FILTER]);
        var highlightChanged = (this.props.query[Query.HIGHLIGHT] !== nextProps.query[Query.HIGHLIGHT]);
        if (filterChanged || highlightChanged) {
            this.state.view.recalculate(this.getViewFilt(), this.state.sortKeyFun);
        }
    },
    onRecalculate: function () {
        this.forceUpdate();
        var selected = this.getSelected();
        if (selected) {
            this.refs.flowTable.scrollIntoView(selected);
        }
    },
    onUpdate: function (flow) {
        if (flow.id === this.getParams().flowId) {
            this.forceUpdate();
        }
    },
    onRemove: function (flow_id, index) {
        if (flow_id === this.getParams().flowId) {
            var flow_to_select = this.state.view.list[Math.min(index, this.state.view.list.length - 1)];
            this.selectFlow(flow_to_select);
        }
    },
    setSortKeyFun: function (sortKeyFun) {
        this.setState({
            sortKeyFun: sortKeyFun
        });
        this.state.view.recalculate(this.getViewFilt(), sortKeyFun);
    },
    selectFlow: function (flow) {
        if (flow) {
            this.replaceWith(
                "flow",
                {
                    flowId: flow.id,
                    detailTab: this.getParams().detailTab || "request"
                }
            );
            this.refs.flowTable.scrollIntoView(flow);
        } else {
            this.replaceWith("flows", {});
        }
    },
    selectFlowRelative: function (shift) {
        var flows = this.state.view.list;
        var index;
        if (!this.getParams().flowId) {
            if (shift > 0) {
                index = flows.length - 1;
            } else {
                index = 0;
            }
        } else {
            var currFlowId = this.getParams().flowId;
            var i = flows.length;
            while (i--) {
                if (flows[i].id === currFlowId) {
                    index = i;
                    break;
                }
            }
            index = Math.min(
                Math.max(0, index + shift),
                flows.length - 1);
        }
        this.selectFlow(flows[index]);
    },
    onKeyDown: function (e) {
        var flow = this.getSelected();
        if (e.ctrlKey) {
            return;
        }
        switch (e.keyCode) {
            case toputils.Key.K:
            case toputils.Key.UP:
                this.selectFlowRelative(-1);
                break;
            case toputils.Key.J:
            case toputils.Key.DOWN:
                this.selectFlowRelative(+1);
                break;
            case toputils.Key.SPACE:
            case toputils.Key.PAGE_DOWN:
                this.selectFlowRelative(+10);
                break;
            case toputils.Key.PAGE_UP:
                this.selectFlowRelative(-10);
                break;
            case toputils.Key.END:
                this.selectFlowRelative(+1e10);
                break;
            case toputils.Key.HOME:
                this.selectFlowRelative(-1e10);
                break;
            case toputils.Key.ESC:
                this.selectFlow(null);
                break;
            case toputils.Key.H:
            case toputils.Key.LEFT:
                if (this.refs.flowDetails) {
                    this.refs.flowDetails.nextTab(-1);
                }
                break;
            case toputils.Key.L:
            case toputils.Key.TAB:
            case toputils.Key.RIGHT:
                if (this.refs.flowDetails) {
                    this.refs.flowDetails.nextTab(+1);
                }
                break;
            case toputils.Key.C:
                if (e.shiftKey) {
                    actions.FlowActions.clear();
                }
                break;
            case toputils.Key.D:
                if (flow) {
                    if (e.shiftKey) {
                        actions.FlowActions.duplicate(flow);
                    } else {
                        actions.FlowActions.delete(flow);
                    }
                }
                break;
            case toputils.Key.A:
                if (e.shiftKey) {
                    actions.FlowActions.accept_all();
                } else if (flow && flow.intercepted) {
                    actions.FlowActions.accept(flow);
                }
                break;
            case toputils.Key.R:
                if (!e.shiftKey && flow) {
                    actions.FlowActions.replay(flow);
                }
                break;
            case toputils.Key.V:
                if (e.shiftKey && flow && flow.modified) {
                    actions.FlowActions.revert(flow);
                }
                break;
            case toputils.Key.SHIFT:
                break;
            default:
                console.debug("keydown", e.keyCode);
                return;
        }
        e.preventDefault();
    },
    getSelected: function () {
        return this.context.flowStore.get(this.getParams().flowId);
    },
    render: function () {
        var selected = this.getSelected();

        var details;
        if (selected) {
            details = [
                <common.Splitter key="splitter"/>,
                <FlowView key="flowDetails" ref="flowDetails" flow={selected}/>
            ];
        } else {
            details = null;
        }

        return (
            <div className="main-view" onKeyDown={this.onKeyDown} tabIndex="0">
                <FlowTable ref="flowTable"
                    selectFlow={this.selectFlow}
                    setSortKeyFun={this.setSortKeyFun}
                    selected={selected} />
                {details}
            </div>
        );
    }
});

module.exports = MainView;
