/*
 * Copyright (c) 2012, salesforce.com, inc.
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

public class RemoteTKController {
    @remoteAction
    public static String describe(String objtype) {
        // Just enough to make the sample app work!
        Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objtype);
        if (targetType == null) {
            return '[{"message":"The requested resource does not exist","errorCode":"NOT_FOUND"}]';
        }
        
        Schema.DescribeSObjectResult sobjResult = targetType.getDescribe();
        
        Map<String, Schema.SObjectField> fieldMap = sobjResult.fields.getMap();
        
        List<Object> fields = new List<Object>();
        for (String key : fieldMap.keySet()) {
            Schema.DescribeFieldResult descField = fieldMap.get(key).getDescribe();
            Map<String, Object> field = new Map<String, Object>();
            
            field.put('type', descField.getType().name().toLowerCase());
            field.put('name', descField.getName());
            field.put('label', descField.getLabel());
            List<String> references = new List<String>();
            for (Schema.sObjectType t: descField.getReferenceTo()) {
                references.add(t.getDescribe().getName());
            }
            if (!references.isEmpty()) {
                field.put('referenceTo', references);
            }
            
            fields.add(field);
        }
        
        Map<String, Object> result = new Map<String, Object>();
        result.put('fields', fields);
        
        return JSON.serialize(result);
    }
    
    @remoteAction
    public static String create(String objtype, String fields) {
        Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objtype);
        Map<String, Schema.sObjectField> targetFields = targetType.getDescribe().fields.getMap();
        if (targetType == null) {
            return '[{"message":"The requested resource does not exist","errorCode":"NOT_FOUND"}]';
        }
        
        SObject obj = targetType.newSObject();
        
        Map<String, Object> fieldMap = null;
        try {
            fieldMap = (Map<String, Object>)JSON.deserializeUntyped(fields);
        } catch (JSONException je) {
            return '[{"message":"'+je.getMessage()+'","errorCode":"JSON_PARSER_ERROR"}]';
        }
        
        try {
            for (String key : fieldMap.keySet()) {
                if (targetFields.get(key).getDescribe().getType() == Schema.DisplayType.Date) {
                    obj.put(key, Date.valueOf((String)fieldMap.get(key)));
                } else if (targetFields.get(key).getDescribe().getType() == Schema.DisplayType.Percent ||
                       targetFields.get(key).getDescribe().getType() == Schema.DisplayType.Currency) {
                    obj.put(key, String.valueOf(fieldMap.get(key)) == '' ? null : Decimal.valueOf((String)fieldMap.get(key)));
                } else if (targetFields.get(key).getDescribe().getType() == Schema.DisplayType.Double) {
                    obj.put(key, String.valueOf(fieldMap.get(key)) == '' ? null : Double.valueOf(fieldMap.get(key)));
                } else if (targetFields.get(key).getDescribe().getType() == Schema.DisplayType.Integer) {
                    obj.put(key, Integer.valueOf(fieldMap.get(key)));
                } else {
                    obj.put(key, fieldMap.get(key));
                }
            }
        } catch (SObjectException soe) {
            return '[{"message":"'+soe.getMessage()+'","errorCode":"INVALID_FIELD"}]';
        }
        
        try {
            insert obj;
        } catch (DMLException dmle) {
            String fieldNames = '';
            for (String field : dmle.getDmlFieldNames(0)) {
                if (fieldNames.length() > 0) {
                    fieldNames += ',';
                }
                fieldNames += '"'+field+'"';
            }
            return '[{"fields":['+fieldNames+'],"message":"'+dmle.getDmlMessage(0)+'","errorCode":"'+dmle.getDmlType(0).name()+'"}]';
        }
        
        Map<String, Object> result = new Map<String, Object>();
        result.put('id', obj.id);
        result.put('errors', new List<String>());
        result.put('success', true);
        
        return JSON.serialize(result);
    }
    
    @remoteAction
    public static String retrieve(String objtype, String id, String fieldlist) {
        // TODO - handle null fieldlist - retrieve all fields
        Boolean containsId = false;
        for (String field : fieldlist.split(',')) {
            if (field.equalsIgnoreCase('id')){
                containsId = true;
                break;
            }
        }
        
        if (!containsId) {
            fieldlist = 'Id,'+fieldlist;
        }
        
        String soql = 'SELECT '+fieldlist+' FROM '+objtype+' WHERE Id = \''+id+'\'';
        List<sObject> records;
        try {
            records = Database.query(soql);
        } catch (QueryException qe) {
            return '[{"message":"'+qe.getMessage()+'","errorCode":"INVALID_QUERY"}]';
        }
        
        return JSON.serialize(records[0]);
    }
    
    /*
    @remoteAction
    public static String upser(String objtype, String externalIdField, String externalId, String fields) {
        Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objtype);
        
        SObject obj = targetType.newSObject();
        obj.put(externalIdField, externalId);
        
        Map<String, Object> fieldMap = 
           (Map<String, Object>)JSON.deserializeUntyped(fields);
        for (String key : fieldMap.keySet()) {
            obj.put(key, fieldMap.get(key));
        }
        
        Schema.SObjectField sobjField = targetType.getDescribe().fields.getMap().get(externalIdField);
        
        // Database.Upsert(obj, sobjField); // error - upsert requires a concrete sobject type
        
        return null;
    }
    */

    @remoteAction
    public static String updat(String objtype, String id, String fields) {
        Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objtype);
        if (targetType == null) {
            return '[{"message":"The requested resource does not exist","errorCode":"NOT_FOUND"}]';
        }
        
        SObject obj = targetType.newSObject(id);
        
        Map<String, Object> fieldMap = null;
        try {
            fieldMap = (Map<String, Object>)JSON.deserializeUntyped(fields);
        } catch (JSONException je) {
            return '[{"message":"'+je.getMessage()+'","errorCode":"JSON_PARSER_ERROR"}]';
        }

        try {
            for (String key : fieldMap.keySet()) {
                obj.put(key, fieldMap.get(key));
            }
        } catch (SObjectException soe) {
            return '[{"message":"'+soe.getMessage()+'","errorCode":"INVALID_FIELD"}]';
        }
        
        try {
            update obj;
        } catch (DMLException dmle) {
            String fieldNames = '';
            for (String field : dmle.getDmlFieldNames(0)) {
                if (fieldNames.length() > 0) {
                    fieldNames += ',';
                }
                fieldNames += '"'+field+'"';
            }
            return '[{"fields":['+fieldNames+'],"message":"'+dmle.getDmlMessage(0)+'","errorCode":"'+dmle.getDmlType(0).name()+'"}]';
        }
        
        return null;
    }

    @remoteAction
    public static String del(String objtype, String id) {
        Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objtype);
        if (targetType == null) {
            return '[{"message":"The requested resource does not exist","errorCode":"NOT_FOUND"}]';
        }
        
        SObject obj = targetType.newSObject(id);
        
        try {
            delete obj;
        } catch (DMLException dmle) {
            String fieldNames = '';
            for (String field : dmle.getDmlFieldNames(0)) {
                if (fieldNames.length() > 0) {
                    fieldNames += ',';
                }
                fieldNames += '"'+field+'"';
            }
            return '[{"fields":['+fieldNames+'],"message":"'+dmle.getDmlMessage(0)+'","errorCode":"'+dmle.getDmlType(0).name()+'"}]';
        }
        
        return null;
    }

    @remoteAction
    public static String query(String soql) {
        List<sObject> records;
        try {
            records = Database.query(soql);
        } catch (QueryException qe) {
            return '[{"message":"'+qe.getMessage()+'","errorCode":"INVALID_QUERY"}]';
        }
        
        Map<String, Object> result = new Map<String, Object>();
        result.put('records', records);
        result.put('totalSize', records.size());
        result.put('done', true);
        
        return JSON.serialize(result);
    }

    @remoteAction
    public static String search(String sosl) {
        List<List<SObject>> result;        
        try {
            result = Search.query(sosl);
        } catch (SearchException se) {
            return '[{"message":"'+se.getMessage()+'","errorCode":"INVALID_SEARCH"}]';
        }
        
        return JSON.serialize(result);
    }
}