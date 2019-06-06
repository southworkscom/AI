/*
 * Microsoft Bot Connector API - v3.0
 * The Bot Connector REST API allows your bot to send and receive messages to channels configured in the  [Bot Framework Developer Portal](https://dev.botframework.com). The Connector service uses industry-standard REST  and JSON over HTTPS.    Client libraries for this REST API are available. See below for a list.    Many bots will use both the Bot Connector REST API and the associated [Bot State REST API](/en-us/restapi/state). The  Bot State REST API allows a bot to store and retrieve state associated with users and conversations.    Authentication for both the Bot Connector and Bot State REST APIs is accomplished with JWT Bearer tokens, and is  described in detail in the [Connector Authentication](/en-us/restapi/authentication) document.    # Client Libraries for the Bot Connector REST API    * [Bot Builder for C#](/en-us/csharp/builder/sdkreference/)  * [Bot Builder for Node.js](/en-us/node/builder/overview/)  * Generate your own from the [Connector API Swagger file](https://raw.githubusercontent.com/Microsoft/BotBuilder/master/CSharp/Library/Microsoft.Bot.Connector.Shared/Swagger/ConnectorAPI.json)    � 2016 Microsoft
 *
 * OpenAPI spec version: v3
 * Contact: botframework@microsoft.com
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */


package client.model;

import com.google.gson.annotations.SerializedName;

import java.util.Objects;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

/**
 * An object relating to a particular point in a conversation
 */
@ApiModel(description = "An object relating to a particular point in a conversation")
@javax.annotation.Generated(value = "io.swagger.codegen.languages.JavaClientCodegen", date = "2018-08-29T10:06:15.114-07:00")
public class ConversationReference {
  @SerializedName("activityId")
  private String activityId = null;

  @SerializedName("user")
  private ChannelAccount user = null;

  @SerializedName("bot")
  private ChannelAccount bot = null;

  @SerializedName("conversation")
  private ConversationAccount conversation = null;

  @SerializedName("channelId")
  private String channelId = null;

  @SerializedName("serviceUrl")
  private String serviceUrl = null;

  public ConversationReference activityId(String activityId) {
    this.activityId = activityId;
    return this;
  }

   /**
   * (Optional) ID of the activity to refer to
   * @return activityId
  **/
  @ApiModelProperty(value = "(Optional) ID of the activity to refer to")
  public String getActivityId() {
    return activityId;
  }

  public void setActivityId(String activityId) {
    this.activityId = activityId;
  }

  public ConversationReference user(ChannelAccount user) {
    this.user = user;
    return this;
  }

   /**
   * (Optional) User participating in this conversation
   * @return user
  **/
  @ApiModelProperty(value = "(Optional) User participating in this conversation")
  public ChannelAccount getUser() {
    return user;
  }

  public void setUser(ChannelAccount user) {
    this.user = user;
  }

  public ConversationReference bot(ChannelAccount bot) {
    this.bot = bot;
    return this;
  }

   /**
   * Bot participating in this conversation
   * @return bot
  **/
  @ApiModelProperty(value = "Bot participating in this conversation")
  public ChannelAccount getBot() {
    return bot;
  }

  public void setBot(ChannelAccount bot) {
    this.bot = bot;
  }

  public ConversationReference conversation(ConversationAccount conversation) {
    this.conversation = conversation;
    return this;
  }

   /**
   * Conversation reference
   * @return conversation
  **/
  @ApiModelProperty(value = "Conversation reference")
  public ConversationAccount getConversation() {
    return conversation;
  }

  public void setConversation(ConversationAccount conversation) {
    this.conversation = conversation;
  }

  public ConversationReference channelId(String channelId) {
    this.channelId = channelId;
    return this;
  }

   /**
   * Channel ID
   * @return channelId
  **/
  @ApiModelProperty(value = "Channel ID")
  public String getChannelId() {
    return channelId;
  }

  public void setChannelId(String channelId) {
    this.channelId = channelId;
  }

  public ConversationReference serviceUrl(String serviceUrl) {
    this.serviceUrl = serviceUrl;
    return this;
  }

   /**
   * Service endpoint where operations concerning the referenced conversation may be performed
   * @return serviceUrl
  **/
  @ApiModelProperty(value = "Service endpoint where operations concerning the referenced conversation may be performed")
  public String getServiceUrl() {
    return serviceUrl;
  }

  public void setServiceUrl(String serviceUrl) {
    this.serviceUrl = serviceUrl;
  }


  @Override
  public boolean equals(java.lang.Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    ConversationReference conversationReference = (ConversationReference) o;
    return Objects.equals(this.activityId, conversationReference.activityId) &&
        Objects.equals(this.user, conversationReference.user) &&
        Objects.equals(this.bot, conversationReference.bot) &&
        Objects.equals(this.conversation, conversationReference.conversation) &&
        Objects.equals(this.channelId, conversationReference.channelId) &&
        Objects.equals(this.serviceUrl, conversationReference.serviceUrl);
  }

  @Override
  public int hashCode() {
    return Objects.hash(activityId, user, bot, conversation, channelId, serviceUrl);
  }


  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class ConversationReference {\n");

    sb.append("    activityId: ").append(toIndentedString(activityId)).append("\n");
    sb.append("    user: ").append(toIndentedString(user)).append("\n");
    sb.append("    bot: ").append(toIndentedString(bot)).append("\n");
    sb.append("    conversation: ").append(toIndentedString(conversation)).append("\n");
    sb.append("    channelId: ").append(toIndentedString(channelId)).append("\n");
    sb.append("    serviceUrl: ").append(toIndentedString(serviceUrl)).append("\n");
    sb.append("}");
    return sb.toString();
  }

  /**
   * Convert the given object to string with each line indented by 4 spaces
   * (except the first line).
   */
  private String toIndentedString(java.lang.Object o) {
    if (o == null) {
      return "null";
    }
    return o.toString().replace("\n", "\n    ");
  }

}

