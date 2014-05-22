@isTest
public with sharing class LABJS_SimpleControllerTest {

    static testmethod void testContacts() {
        Contact c = new Contact( firstname = 'Test', lastname='contact' );
        insert c;
        LABJS_SimpleController sc = new LABJS_SimpleController();
        system.assert(sc.getContacts().size() == 1);
    
        String contactsJSON = sc.getContactsJson();
        List<Contact> contactsDeserialized = (List<Contact>) JSON.deserialize(contactsJSON, List<Contact>.class);
        System.assert(contactsDeserialized.size() == 1);
    }
    
    static testmethod void testContactLeadSources() {
        LABJS_SimpleController sc = new LABJS_SimpleController();
        system.assert(sc.getLeadSources().size() > 1);        
        Contact c = new Contact( firstname = 'Test', lastname='contact', leadsource='web' );
        insert c;        
        
        sc.targetContactId = c.id;
        sc.targetContactLeadSource = 'phone';
        sc.updateContactLeadSource();
        c = [Select Id, LeadSource From Contact Where Id =: c.id];
        System.assert(c.leadsource == 'phone');
        
    }
    
    static testmethod void testSortableIndex() {
        LABJS_SimpleController sc = new LABJS_SimpleController();
        system.assert(sc.getLeadSources().size() > 1);        
        Contact c = new Contact( firstname = 'Test', lastname='contact', leadsource='web', sortable_index__c = 5 );
        insert c;        
        
        sc.contactSortableIndexJsonString = c.id;
        sc.updateContactSortableIndex();

		c = [select id, sortable_index__c from Contact Where id = :c.id];
		System.assert(c.sortable_index__c == 1);        
    }
    
    static testmethod void testUpdateTargetContact() {
        Contact c = new Contact( firstname = 'Test', lastname='contact', leadsource='web', sortable_index__c = 5 );
        insert c;        

        LABJS_SimpleController sc = new LABJS_SimpleController();
		System.assert(sc.targetContact == null);
        
        sc.targetContactId = c.id;
        sc.updateTargetContact();
        System.assert(sc.targetContact != null);
        System.assert(sc.targetContact.id == c.id);        
    }
}