@isTest
public class TestRemoteTKController{
    private static String tooLongAccName = 'LOTS OF '+
        'CHARACTERS XXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'+
        'XXXXXXXXXXXXXXXX';
    
    static private void assertError(String jsonResult, String expectedError, String method) {
        List<Object> errorArray = (List<Object>)JSON.deserializeUntyped(jsonResult);
        
        System.assertNotEquals(null, errorArray, 
                               'error array missing from '+method+' result');
        System.assertNotEquals(0, errorArray.size(), 
                               'error array is empty in '+method+' result');
        
        Map<String, Object> error = (Map<String, Object>)errorArray[0];
        String errorCode = (String)error.get('errorCode');
        System.assertNotEquals(null, errorCode, 
                               'errorCode property missing from '+method+' result');
        System.assertEquals(expectedError, errorCode, 
                               'errorCode should be '+expectedError+' in '+method+' result');
    }
    
    static testMethod void testDescribe() {
        // Assume we have accounts
        String jsonResult = RemoteTKController.describe('Account');
        
        System.assertNotEquals(null, jsonResult, 
                               'RemoteTKController.describe returned null');
                      
        Map<String, Object> result = (Map<String, Object>)JSON.deserializeUntyped(jsonResult);
        
        System.assertNotEquals(null, result.get('fields'), 
                               'fields property missing from RemoteTKController.describe result');

        // TODO - more assertions on describe results
        
        // Invalid object type
        // Hope there isn't a QXZXQZXZQXZQ object type!
        jsonResult = RemoteTKController.describe('QXZXQZXZQXZQ');
        assertError(jsonResult, 'NOT_FOUND', 'RemoteTKController.describe');        
    }
    
    static private void assertRecord(Map<String, Object> record, String accName, String accNumber, String method) {
        Map<String, Object> attributes = (Map<String, Object>)record.get('attributes');
        System.assertNotEquals(null, attributes, 
                               'attributes property missing from '+method+' result');
        System.assertNotEquals(0, attributes.keySet().size(), 
                               'empty attributes object in '+method+' result');
        
        String type = (String)attributes.get('type');
        System.assertNotEquals(null, type, 
                               'type property missing from '+method+' result');
        System.assertEquals('Account', type, 
                               'Wrong type in '+method+' result');
        
        String url = (String)attributes.get('url');
        System.assertNotEquals(null, url, 
                               'url property missing from '+method+' result');
       
        Id id = (Id)record.get('Id');
        System.assertNotEquals(null, id, 
                               'Id property missing from '+method+' result');
        Account account = [SELECT Id, Name FROM Account WHERE Id = :id LIMIT 1];
        System.assertNotEquals(null, account, 
                               'Couldn\'t find account record identified by '+method+' result');
        System.assertEquals(accName, account.Name, 
                               'Account name doesn\'t match in '+method+' result');
        
        String name = (String)record.get('Name');
        System.assertNotEquals(null, name, 
                               'Name property missing from '+method+' result');
        System.assertEquals(accName, name, 
                               'Wrong account name in '+method+' result');
   
        String accountNumber = (String)record.get('AccountNumber');
        System.assertNotEquals(null, name, 
                               'AccountNumber property missing from '+method+' result');
        System.assertEquals(accNumber, accountNumber, 
                               'Wrong account number in '+method+' result');
    }
    
    static private Id testCreate(String accName, String accNumber) {
        // Assume we can create an account
        String jsonResult = RemoteTKController.create('Account', '{"Name": "'+accName+'", "AccountNumber" : "'+accNumber+'"}');
        
        System.assertNotEquals(null, jsonResult, 
                               'RemoteTKController.create returned null');
        
        Map<String, Object> result = (Map<String, Object>)JSON.deserializeUntyped(jsonResult);
        
        Boolean success = (Boolean)result.get('success');
        System.assertNotEquals(null, success, 
                               'success property missing from RemoteTKController.create result');
        System.assertNotEquals(false, success, 
                               'success is false in RemoteTKController.create result');
        
        List<Object> errors = (List<Object>)result.get('errors');
        System.assertNotEquals(null, errors, 
                               'errors property missing from RemoteTKController.create result');
        System.assertEquals(0, errors.size(), 
                               'errors array is not empty in RemoteTKController.create result');
        
        Id id = (Id)result.get('id');
        System.assertNotEquals(null, id, 
                               'id property missing from RemoteTKController.create result');
        Account account = [SELECT Id, Name, AccountNumber FROM Account LIMIT 1];
        System.assertNotEquals(null, account, 
                               'Couldn\'t find account record created by RemoteTKController.create result');
        System.assertEquals(accName, account.Name, 
                               'Account name doesn\'t match in RemoteTKController.create result');
        System.assertEquals(accNumber, account.AccountNumber, 
                               'Account number doesn\'t match in RemoteTKController.create result');
        
        jsonResult = RemoteTKController.create('QXZXQZXZQXZQ', '{"Name": "'+accName+'"}');
        assertError(jsonResult, 'NOT_FOUND', 'RemoteTKController.create');
                
        jsonResult = RemoteTKController.create('Account', '{"Name" "'+accName+'"}');
        assertError(jsonResult, 'JSON_PARSER_ERROR', 'RemoteTKController.create');
                
        jsonResult = RemoteTKController.create('Account', '{"XQZXQZXQZXQZ" : "'+accName+'"}');
        assertError(jsonResult, 'INVALID_FIELD', 'RemoteTKController.create');

        jsonResult = RemoteTKController.create('Account', '{"Name" : "'+tooLongAccName+'"}');
        assertError(jsonResult, 'STRING_TOO_LONG', 'RemoteTKController.create');

        return id;
    }
    
    static private void testRetrieve(String accName, String accNumber, Id id) {
        String jsonResult = RemoteTKController.retrieve('Account', id, 'Name, AccountNumber');
        
        System.assertNotEquals(null, jsonResult, 
                               'RemoteTKController.retrieve returned null');
        
        Map<String, Object> result = (Map<String, Object>)JSON.deserializeUntyped(jsonResult);
        
        assertRecord(result, accName, accNumber, 'RemoteTKController.retrieve');        
        
        // TODO - test negative paths for retrieve
    }

    static private void testQuery(String accName, String accNumber) {
        String jsonResult = RemoteTKController.query('SELECT Id, Name, AccountNumber FROM Account WHERE Name = \''+accName+'\'');
        
        System.assertNotEquals(null, jsonResult, 
                               'RemoteTKController.query returned null');
        
        Map<String, Object> result = (Map<String, Object>)JSON.deserializeUntyped(jsonResult);
        
        List<Object> records = (List<Object>)result.get('records');
        System.assertNotEquals(null, records, 
                               'records property missing from RemoteTKController.query result');
        System.assertEquals(1, records.size(), 
                               'records array should have single record in RemoteTKController.query result');
        
        Map<String, Object> record = (Map<String, Object>)records[0];
        
        assertRecord(record, accName, accNumber, 'RemoteTKController.query');        
                
        Integer totalSize = (Integer)result.get('totalSize');
        System.assertNotEquals(null, totalSize, 
                               'totalSize property missing from RemoteTKController.query result');
        System.assertEquals(1, totalSize, 
                               'totalSize should be 1 in RemoteTKController.query result');

        Boolean done = (Boolean)result.get('done');
        System.assertNotEquals(null, done, 
                               'done property missing from RemoteTKController.query result');
        System.assertEquals(true, done, 
                            'done should be true in RemoteTKController.query result');
        
        jsonResult = RemoteTKController.query('SSSSSS Id, Name FROM Account WHERE Name = \''+accName+'\'');
        assertError(jsonResult, 'INVALID_QUERY', 'RemoteTKController.query');
    }

    static private void testSearch(String accName, String accNumber, Id id) {
        Id [] fixedSearchResults= new Id[1];
        fixedSearchResults[0] = id;
        Test.setFixedSearchResults(fixedSearchResults);
        String jsonResult = RemoteTKController.search('FIND {'+accName+'} IN ALL FIELDS RETURNING Account (Id, Name, AccountNumber)');
        
        System.assertNotEquals(null, jsonResult, 
                               'RemoteTKController.search returned null');
        
        List<Object> result = (List<Object>)JSON.deserializeUntyped(jsonResult);
        
        List<Object> records = (List<Object>)result[0];
        
        Map<String, Object> record = (Map<String, Object>)records[0];
        
        assertRecord(record, accName, accNumber, 'RemoteTKController.search'); 
        
        jsonResult = RemoteTKController.search('FFFF {'+accName+'} IN ALL FIELDS RETURNING Account (Id, Name)');
        assertError(jsonResult, 'INVALID_SEARCH', 'RemoteTKController.search');
    }

    static private void testUpdate(String accName, String accNumber, Id id) {
        String jsonResult = RemoteTKController.updat('Account', id, '{"Name":"'+accName+'1", "AccountNumber":"'+accNumber+'1"}'); 
        System.assertEquals(null, jsonResult, 
                               'Non-null result from RemoteTKController.updat');
        Account account = [SELECT Id, Name, AccountNumber FROM Account WHERE Id = :id LIMIT 1];
        System.assertNotEquals(null, account, 
                               'Couldn\'t find account record after RemoteTKController.updat');
        System.assertEquals(accName+'1', account.Name, 
                               'Account name doesn\'t match after RemoteTKController.updat');
        System.assertEquals(accNumber+'1', account.AccountNumber, 
                               'Account number doesn\'t match after RemoteTKController.updat');
        
        jsonResult = RemoteTKController.updat('QXZXQZXZQXZQ', id, '{"Name":"'+accName+'1"}');
        assertError(jsonResult, 'NOT_FOUND', 'RemoteTKController.updat');
        
        jsonResult = RemoteTKController.updat('Account', id, '{"XQZXQZXQZXQZ" : "'+accName+'1"}');
        assertError(jsonResult, 'INVALID_FIELD', 'RemoteTKController.updat');

        jsonResult = RemoteTKController.updat('Account', id, '{"Name" "'+accName+'"}');
        assertError(jsonResult, 'JSON_PARSER_ERROR', 'RemoteTKController.updat');
                
        jsonResult = RemoteTKController.updat('Account', id, '{"Name" : "'+tooLongAccName+'"}');
        assertError(jsonResult, 'STRING_TOO_LONG', 'RemoteTKController.updat');
    }

    static private void testUpsert(String accName, String accNumber, Id id) {
        String jsonResult = RemoteTKController.upser('Account', 'Id', (String)id, '{"Name":"'+accName+'2", "AccountNumber":"'+accNumber+'2"}');
        System.assertEquals(null, jsonResult, 
                               'Non-null result from RemoteTKController.upser');
        Account account = [SELECT Id, Name, AccountNumber FROM Account WHERE Id = :id LIMIT 1];
        System.assertNotEquals(null, account, 
                               'Couldn\'t find account record after RemoteTKController.upser');
        System.assertEquals(accName+'2', account.Name, 
                               'Account name doesn\'t match after RemoteTKController.upser');
        System.assertEquals(accNumber+'2', account.AccountNumber, 
                               'Account number doesn\'t match after RemoteTKController.upser');
        
        jsonResult = RemoteTKController.upser('QXZXQZXZQXZQ', 'Id', (String)id, '{"Name":"'+accName+'2"}');
        assertError(jsonResult, 'NOT_FOUND', 'RemoteTKController.upser');
        
        jsonResult = RemoteTKController.upser('Account', 'Id', (String)id, '{"XQZXQZXQZXQZ" : "'+accName+'2"}');
        assertError(jsonResult, 'INVALID_FIELD', 'RemoteTKController.upser');
    }

    static private void testDelete(Id id) {
        String jsonResult = RemoteTKController.del('QXZXQZXZQXZQ', id);
        assertError(jsonResult, 'NOT_FOUND', 'RemoteTKController.del');

        jsonResult = RemoteTKController.del('Account', id); 
        System.assertEquals(null, jsonResult, 
                               'Non-null result from RemoteTKController.del');
        List<Account> accounts = [SELECT Id, Name FROM Account WHERE Id = :id];
        System.assertEquals(0, accounts.size(), 
                               'Account record was not deleted by RemoteTKController.del');

        jsonResult = RemoteTKController.del('Account', id); 
        assertError(jsonResult, 'ENTITY_IS_DELETED', 'RemoteTKController.del');
    }
    
    static testMethod void testCRUD() {
        String accName = 'Test1';
        String accNumber = '1234';
        
        Id id = testCreate(accName, accNumber);
        testRetrieve(accName, accNumber, id);
        testQuery(accName, accNumber);
        testSearch(accName, accNumber, id);
        testUpdate(accName, accNumber, id);
        testUpsert(accName, accNumber, id);
        testDelete(id);
    }
}