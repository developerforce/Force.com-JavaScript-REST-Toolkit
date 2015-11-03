/*
 * Copyright (c) 2011, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/*
  * This is a simple jQuery Mobile-based app that uses the Force.com REST API.
  * See mobile.page for code required to run this in Visualforce
  * See mobile.html for code required to run this on your own server
  */

function errorCallback(jqXHR){
    alert(jqXHR.statusText + ": " + jqXHR.responseText);
}

function addClickListeners() {
    $('#newbtn').click(function(e) {
        // Show the 'New Account' form
        e.preventDefault();
        $('#accountform')[0].reset();
        $('#accformheader').text('New Account');
        setButtonText('#actionbtn', 'Create');
        $('#actionbtn').unbind('click.btn').bind('click.btn', createHandler);
        $.mobile.changePage('#editpage', "slide", false, true);
    });

    $('#deletebtn').click(function(e) {
        // Delete the account
        e.preventDefault();
        $.mobile.loading('show');
        client.del('Account', $('#accountdetail').find('#Id').val()
        ,
        function(response) {
            getAccounts(function() {
                $.mobile.loading('hide');
                $.mobile.changePage('#mainpage', "slide", true, true);
            });
        }, errorCallback);
    });

    $('#editbtn').click(function(e) {
        // Get account fields and show the 'Edit Account' form
        e.preventDefault();
        $.mobile.loading('show');
        client.retrieve("Account", $('#accountdetail').find('#Id').val()
        , "Name,Id,Industry,TickerSymbol",
        function(response) {
            $('#accountform').find('input').each(function() {
                $(this).val(response[$(this).attr("name")]);
            });
            $('#accformheader').text('Edit Account');
            setButtonText('#actionbtn', 'Update');
            $('#actionbtn')
            .unbind('click.btn')
            .bind('click.btn', updateHandler);
            $.mobile.loading('hide');
            $.mobile.changePage('#editpage', "slide", false, true);
        }, errorCallback);
    });
}

// Populate the account list and set up click handling
function getAccounts(callback) {
    $('#accountlist').empty();
    client.query("SELECT Id, Name FROM Account ORDER BY Name LIMIT 20"
    ,
    function(response) {
        $.each(response.records,
        function() {
            var id = this.Id;
            $('<li></li>')
            .hide()
            .append('<a href="#"><h2>' + this.Name + '</h2></a>')
            .click(function(e) {
                e.preventDefault();
                $.mobile.loading('show');
                // We could do this more efficiently by adding Industry and
                // TickerSymbol to the fields in the SELECT, but we want to
                // show dynamic use of the retrieve function...
                client.retrieve("Account", id, "Name,Id,Industry,TickerSymbol"
                ,
                function(response) {
                    $('#Name').text(response.Name);
                    $('#Industry').text(response.Industry);
                    $('#TickerSymbol').text(response.TickerSymbol);
                    $('#Id').val(response.Id);
                    $.mobile.loading('hide');
                    $.mobile.changePage('#detailpage', "slide", false, true);
                }, errorCallback);
            })
            .appendTo('#accountlist')
            .show();
        });

        $('#accountlist').listview('refresh');

        if (typeof callback != 'undefined' && callback != null) {
            callback();
        }
    }, errorCallback);
}

// Gather fields from the account form and create a record
function createHandler(e) {
    e.preventDefault();
    var accountform = $('#accountform');
    var fields = {};
    accountform.find('input').each(function() {
        var child = $(this);
        if (child.val().length > 0 && child.attr("name") != 'Id') {
            fields[child.attr("name")] = child.val();
        }
    });
    $.mobile.loading('show');
    client.create('Account', fields,
    function(response) {
        getAccounts(function() {
            $.mobile.loading('hide');
            $.mobile.changePage('#mainpage', "slide", true, true);
        });
    }, errorCallback);
}

// Gather fields from the account form and update a record
function updateHandler(e) {
    e.preventDefault();
    var accountform = $('#accountform');
    var fields = {};
    accountform.find('input').each(function() {
        var child = $(this);
        if (child.val().length > 0 && child.attr("name") != 'Id') {
            fields[child.attr("name")] = child.val();
        }
    });
    $.mobile.loading('show');
    client.update('Account', accountform.find('#Id').val(), fields
    ,
    function(response) {
        getAccounts(function() {
            $.mobile.loading('hide');
            $.mobile.changePage('#mainpage', "slide", true, true);
        });
    }, errorCallback);
}

// Ugh - this is required to change text on a jQuery Mobile button
// due to the way it futzes with things at runtime
function setButtonText(id, str) {
    $(id).text(str).parent().find('.ui-btn-text').text(str);
}
