var React = require("react");
var $ = require("jquery");

var Filt = require("../filt/filt.js");
var utils = require("../utils.js");
var common = require("./common.js");
var actions = require("../actions.js");
var Query = require("../actions.js").Query;

var FilterDocs = React.createClass({
    statics: {
        xhr: false,
        doc: false
    },
    componentWillMount: function () {
        if (!FilterDocs.doc) {
            FilterDocs.xhr = $.getJSON("/filter-help").done(function (doc) {
                FilterDocs.doc = doc;
                FilterDocs.xhr = false;
            });
        }
        if (FilterDocs.xhr) {
            FilterDocs.xhr.done(function () {
                this.forceUpdate();
            }.bind(this));
        }
    },
    render: function () {
        if (!FilterDocs.doc) {
            return <i className="fa fa-spinner fa-spin"></i>;
        } else {
            var commands = FilterDocs.doc.commands.map(function (c) {
                return <tr key={c[1]}>
                    <td>{c[0].replace(" ", '\u00a0')}</td>
                    <td>{c[1]}</td>
                </tr>;
            });
            commands.push(<tr key="docs-link">
                <td colSpan="2">
                    <a href="https://mitmproxy.org/doc/features/filters.html"
                        target="_blank">
                        <i className="fa fa-external-link"></i>
                    &nbsp; mitmproxy docs</a>
                </td>
            </tr>);
            return <table className="table table-condensed">
                <tbody>{commands}</tbody>
            </table>;
        }
    }
});
var FilterInput = React.createClass({
    getInitialState: function () {
        // Consider both focus and mouseover for showing/hiding the tooltip,
        // because onBlur of the input is triggered before the click on the tooltip
        // finalized, hiding the tooltip just as the user clicks on it.
        return {
            value: this.props.value,
            focus: false,
            mousefocus: false
        };
    },
    componentWillReceiveProps: function (nextProps) {
        this.setState({value: nextProps.value});
    },
    onChange: function (e) {
        var nextValue = e.target.value;
        this.setState({
            value: nextValue
        });
        // Only propagate valid filters upwards.
        if (this.isValid(nextValue)) {
            this.props.onChange(nextValue);
        }
    },
    isValid: function (filt) {
        try {
            Filt.parse(filt || this.state.value);
            return true;
        } catch (e) {
            return false;
        }
    },
    getDesc: function () {
        var desc;
        try {
            desc = Filt.parse(this.state.value).desc;
        } catch (e) {
            desc = "" + e;
        }
        if (desc !== "true") {
            return desc;
        } else {
            return (
                <FilterDocs/>
            );
        }
    },
    onFocus: function () {
        this.setState({focus: true});
    },
    onBlur: function () {
        this.setState({focus: false});
    },
    onMouseEnter: function () {
        this.setState({mousefocus: true});
    },
    onMouseLeave: function () {
        this.setState({mousefocus: false});
    },
    onKeyDown: function (e) {
        if (e.keyCode === utils.Key.ESC || e.keyCode === utils.Key.ENTER) {
            this.blur();
            // If closed using ESC/ENTER, hide the tooltip.
            this.setState({mousefocus: false});
        }
    },
    blur: function () {
        this.refs.input.getDOMNode().blur();
    },
    focus: function () {
        this.refs.input.getDOMNode().select();
    },
    render: function () {
        var isValid = this.isValid();
        var icon = "fa fa-fw fa-" + this.props.type;
        var groupClassName = "filter-input input-group" + (isValid ? "" : " has-error");

        var popover;
        if (this.state.focus || this.state.mousefocus) {
            popover = (
                <div className="popover bottom" onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
                    <div className="arrow"></div>
                    <div className="popover-content">
                    {this.getDesc()}
                    </div>
                </div>
            );
        }

        return (
            <div className={groupClassName}>
                <span className="input-group-addon">
                    <i className={icon} style={{color: this.props.color}}></i>
                </span>
                <input type="text" placeholder={this.props.placeholder} className="form-control"
                    ref="input"
                    onChange={this.onChange}
                    onFocus={this.onFocus}
                    onBlur={this.onBlur}
                    onKeyDown={this.onKeyDown}
                    value={this.state.value}/>
                {popover}
            </div>
        );
    }
});

var MainMenu = React.createClass({
    mixins: [common.Navigation, common.RouterState, common.SettingsState],
    statics: {
        title: "Start",
        route: "flows"
    },
    onFilterChange: function (val) {
        var d = {};
        d[Query.FILTER] = val;
        this.setQuery(d);
    },
    onHighlightChange: function (val) {
        var d = {};
        d[Query.HIGHLIGHT] = val;
        this.setQuery(d);
    },
    onInterceptChange: function (val) {
        actions.SettingsActions.update({intercept: val});
    },
    render: function () {
        var filter = this.getQuery()[Query.FILTER] || "";
        var highlight = this.getQuery()[Query.HIGHLIGHT] || "";
        var intercept = this.state.settings.intercept || "";

        return (
            <div>
                <div className="menu-row">
                    <FilterInput
                        placeholder="Filter"
                        type="filter"
                        color="black"
                        value={filter}
                        onChange={this.onFilterChange} />
                    <FilterInput
                        placeholder="Highlight"
                        type="tag"
                        color="hsl(48, 100%, 50%)"
                        value={highlight}
                        onChange={this.onHighlightChange}/>
                    <FilterInput
                        placeholder="Intercept"
                        type="pause"
                        color="hsl(208, 56%, 53%)"
                        value={intercept}
                        onChange={this.onInterceptChange}/>
                </div>
                <div className="clearfix"></div>
            </div>
        );
    }
});


var ViewMenu = React.createClass({
    statics: {
        title: "View",
        route: "flows"
    },
    mixins: [common.Navigation, common.RouterState],
    toggleEventLog: function () {
        var d = {};

        if (this.getQuery()[Query.SHOW_EVENTLOG]) {
            d[Query.SHOW_EVENTLOG] = undefined;
        } else {
            d[Query.SHOW_EVENTLOG] = "t"; // any non-false value will do it, keep it short
        }

        this.setQuery(d);
    },
    render: function () {
        var showEventLog = this.getQuery()[Query.SHOW_EVENTLOG];
        return (
            <div>
                <button
                    className={"btn " + (showEventLog ? "btn-primary" : "btn-default")}
                    onClick={this.toggleEventLog}>
                    <i className="fa fa-database"></i>
                &nbsp;Show Eventlog
                </button>
                <span> </span>
            </div>
        );
    }
});


var ReportsMenu = React.createClass({
    statics: {
        title: "Visualization",
        route: "reports"
    },
    render: function () {
        return <div>Reports Menu</div>;
    }
});

var FileMenu = React.createClass({
    getInitialState: function () {
        return {
            showFileMenu: false
        };
    },
    handleFileClick: function (e) {
        e.preventDefault();
        if (!this.state.showFileMenu) {
            var close = function () {
                this.setState({showFileMenu: false});
                document.removeEventListener("click", close);
            }.bind(this);
            document.addEventListener("click", close);

            this.setState({
                showFileMenu: true
            });
        }
    },
    handleNewClick: function (e) {
        e.preventDefault();
        if (confirm("Delete all flows?")) {
            actions.FlowActions.clear();
        }
    },
    handleOpenClick: function (e) {
        e.preventDefault();
        console.error("unimplemented: handleOpenClick");
    },
    handleSaveClick: function (e) {
        e.preventDefault();
        console.error("unimplemented: handleSaveClick");
    },
    handleShutdownClick: function (e) {
        e.preventDefault();
        console.error("unimplemented: handleShutdownClick");
    },
    render: function () {
        var fileMenuClass = "dropdown pull-left" + (this.state.showFileMenu ? " open" : "");

        return (
            <div className={fileMenuClass}>
                <a href="#" className="special" onClick={this.handleFileClick}> mitmproxy </a>
                <ul className="dropdown-menu" role="menu">
                    <li>
                        <a href="#" onClick={this.handleNewClick}>
                            <i className="fa fa-fw fa-file"></i>
                            New
                        </a>
                    </li>
                    <li role="presentation" className="divider"></li>
                    <li>
                        <a href="http://mitm.it/" target="_blank">
                            <i className="fa fa-fw fa-external-link"></i>
                            Install Certificates...
                        </a>
                    </li>
                {/*
                 <li>
                 <a href="#" onClick={this.handleOpenClick}>
                 <i className="fa fa-fw fa-folder-open"></i>
                 Open
                 </a>
                 </li>
                 <li>
                 <a href="#" onClick={this.handleSaveClick}>
                 <i className="fa fa-fw fa-save"></i>
                 Save
                 </a>
                 </li>
                 <li role="presentation" className="divider"></li>
                 <li>
                 <a href="#" onClick={this.handleShutdownClick}>
                 <i className="fa fa-fw fa-plug"></i>
                 Shutdown
                 </a>
                 </li>
                 */}
                </ul>
            </div>
        );
    }
});


var header_entries = [MainMenu, ViewMenu /*, ReportsMenu */];


var Header = React.createClass({
    mixins: [common.Navigation],
    getInitialState: function () {
        return {
            active: header_entries[0]
        };
    },
    handleClick: function (active, e) {
        e.preventDefault();
        this.replaceWith(active.route);
        this.setState({active: active});
    },
    render: function () {
        var header = header_entries.map(function (entry, i) {
            var className;
            if(entry === this.state.active){
                className = "active";
            } else {
                className = "";
            }
            return (
                <a key={i}
                    href="#"
                    className={className}
                    onClick={this.handleClick.bind(this, entry)}>
                    { entry.title}
                </a>
            );
        }.bind(this));

        return (
            <header>
                <nav className="nav-tabs nav-tabs-lg">
                    <FileMenu/>
                    {header}
                </nav>
                <div className="menu">
                    <this.state.active/>
                </div>
            </header>
        );
    }
});


module.exports = {
    Header: Header
};