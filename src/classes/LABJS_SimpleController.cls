public class LABJS_SimpleController{

    public Id targetContactId { get; set; }
    public Contact targetContact { get; set; }
    public String targetContactLeadSource { get; set; }
    public String contactSortableIndexJsonString { get; set; }
    
    public List<Contact> getContacts() {
        return [Select ID, Name, Phone, LeadSource, Sortable_Index__c From Contact Order By Sortable_Index__c LIMIT 100];   
    }
    
    public String getContactsJson() {
     	List<Contact> contacts = getContacts();
        String ret = JSON.serialize(contacts);
        return ret;
    }
    
    public List<String> getLeadSources() {
        List<String> ret = new List<String>();
        for (Schema.PicklistEntry current : Contact.LeadSource.getDescribe().getPicklistValues()) {
            ret.add(current.getValue());
        }
        return ret;
    }    
    
    public void updateContactLeadSource() {
        System.debug('*****' + this.targetContactId);
        Contact c = new Contact();
        c.id = this.targetContactId;
        c.leadsource = this.targetContactLeadSource;
        update c;
    }
    
    public void updateContactSortableIndex() {
        System.debug('**** updateContactSortableIndex ' + contactSortableIndexJsonString);
       
        String[] splitIds = contactSortableIndexJsonString.split('_'); 
        
        List<Contact> toUpdate = new List<Contact>();
        Integer index = 0;
        
        for (String current : splitIds) {
            index++;
            Contact updateContact = new Contact();
            updateContact.Id = current;
            updateContact.Sortable_Index__c = index;
            toUpdate.add(updateContact);
        }
        
        update toUpdate;
    }
    
    public void updateTargetContact() {
    
        Contact target = [Select Id, Name, Phone From Contact Where Id = :targetContactId];
        System.debug('****' + target.name);
        this.targetContact = target;
    }    
}